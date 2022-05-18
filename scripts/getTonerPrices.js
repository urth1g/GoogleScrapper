const axios = require('axios');
const Database = require('../db/db');
const { getAccessories } = require('../database_getters/accessories');
const __subsets = require('../helpers/subsets');
const tsfc = require('../helpers/transformStringForComparison');
const fs = require('fs');
const cheerio = require('cheerio')
const search = require('../helpers/search');
const { findTheBestPriceAmazon } = require('../amazon/amazonScrapper')

const timer = ms => new Promise(res => setTimeout(res, ms))

function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}

async function searchGoogleToners(productName, partNumber){

	let hl = "en";
	let gl = "us";
	let tbm = "shop";
  	let arr = productName.split(" ");
  	let model = arr[arr.length - 1];
  	let brand = arr[0];

		return new Promise( async (resolve, reject) => {
			axios.get(`https://shopping.google.com/search?q=${term}&hl=${hl}&gl=${gl}&tbm=${tbm}`).then( async res => {
				let regex = /((?<=href=\")((?!=\<|\{|\,|http[s]?).)*?\boffers\b.+?(?="))/g
				let regex2 = /data\-what\=\"1\".+?\h3.+?\>(.+?(?=\<))/g
				//let regex3 = /title\=\"((?:(?!title|td).)*?)(\/shopping\/product.*?(?=\/offers).+?)(?=\")/g
				let regex3 = /title\=\"((?:(?!title|td).)*?)<a href="(\/shopping\/product.*?(?=\/offers).+?)(?=\")/g
				let regex4 = /^(.+?)(?=\")/g;
				let regex5 = /Best\smatch.+?\/offers.+?\"/g
				let regex6 = /((?:(?!\").)*?\/offers.+?(?=\"))/g
				let regex7 = /server\"\>.+?\>(?:(?!img))(.*?)\</g
				let regex8 = /title\=\"((?:(?!title).)*?)".+?\$(.+?)<.+?<div.+?>.+?\>(.+?)</g

				let matches = regex3.exec(res.data);
		})
	})
}

async function searchAmazonToners(productName, color, model, matnr, pack){

	return new Promise( async (resolve, reject) => {

		let term = productName;

		console.log(productName)
		console.log(color)
		console.log(model)
		console.log(matnr)
		console.log(pack)

		try{
			res = await axios.get('https://www.amazon.com/s?k=' + term, {
				headers:{
				    'User-Agent':`Mozilla/5.0 (Macintosh; Intel Mac OS X ${randomIntFromInterval(55,100)}_${randomIntFromInterval(59,100)}_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36`
				}
			});
		}catch(e){
			console.log(e)
		}

		const $ = cheerio.load(res.data);

		let spans = $(".s-title-instructions-style").filter(function(){
			let text = $(this).find(".a-text-normal span").text().toLowerCase()

			if(pack){
				let _pack = tsfc(pack).replaceAll(/pack/g, "pk")

				let includesPack = tsfc(text).includes(tsfc(pack)) || tsfc(text).includes(_pack)
				return ( text.toLowerCase().includes('toner') || 
				text.toLowerCase().includes('cartridge') ) &&
				includesPack
			}else{
				return text.toLowerCase().includes('toner') ||
				text.toLowerCase().includes('cartridge') 
			} 
		});

		let objects = [];

		await spans.each(async function(){
			let text = $(this).find(".a-text-normal span").text()
			let href = 'https://amazon.com' + $(this).find(".a-text-normal").attr('href')
			let isGenuine = text.toLowerCase().includes('replacement') ? false : true

			let subset = await __subsets.v2(text)
			
			let distance = Number.MAX_SAFE_INTEGER

			subset.forEach(x => {
				distance = Math.min(search(tsfc(x),tsfc(model)), distance)
			})

			if(distance === 0){
				objects.push({
					text: text,
					url: href,
					isGenuine: isGenuine
				})
			}
		})

		let _prices = await findTheBestPriceAmazon(objects);

		_prices = _prices.filter(x => !Number.isNaN(x.price))

		if(_prices.length === 0){
			await emptyAmazonLogs()
			resolve([])
			return;
		}
		let currentPrice = await Database.getInstance().promise().query("SELECT Cost FROM toner_details_final WHERE Matnr = ?", [matnr])

		currentPrice = currentPrice.length > 1 ? currentPrice[0] : null
		currentPrice = currentPrice.length > 1 ? currentPrice[0].Cost : null

		let minimumPrice = _prices.filter( x => x.isGenuine ).sort((a,b) => a - b)

		if(minimumPrice.length > 0){
			let mp = minimumPrice[0].price;

			Database.getInstance().query("INSERT INTO inventory (Matnr, Amazon) VALUES (?,?)", [matnr, JSON.stringify(_prices)], (err, result) => {
				if(err) {
					if(err.errno === 1062){
					console.log('Amazon inventory updated.')
						Database.getInstance().query("UPDATE inventory SET Amazon = ? WHERE Matnr = ?", [JSON.stringify(_prices), matnr], (err, result) => {
							if(err) console.log(err);
	
							console.log('UPDATED')
							console.log(result)
							console.log(matnr)
							console.log('----------------')
							resolve(_prices)
						})
					}
				}

				console.log('INSERTED')
				console.log(result)
				console.log(matnr)
				console.log('----------------')
	
				resolve(_prices)
			})
		}else{
			await emptyAmazonLogs()
			resolve([])
		}
	})
}

function emptyAmazonLogs(matnr){

	return new Promise( (resolve, reject) => {
		Database.getInstance().query("INSERT INTO inventory (Matnr, Amazon) VALUES (?,?)", [matnr, '[]'], (err, result) => {

			console.log('inserted: ', matnr)
			if(err) {
				if(err.errno === 1062){
					console.log('Amazon inventory updated.')

					Database.getInstance().query("UPDATE inventory SET Amazon = ? WHERE Matnr = ?", ['[]', matnr], (err, result) => {
						if(err) reject(err);
	
						console.log('updated: ', matnr)
						resolve(true)
					})
				}
			}
	
			resolve(true)
		})
	})
}

//run()
