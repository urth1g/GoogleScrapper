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

function interateThroughSubsets(object, term, productName, model){
	return new Promise ((resolve, reject) =>{
		let grading = [];

		object.forEach(async (x,i) => {
			let subsets = await __subsets.v2(x.name);

			let distance = Number.MAX_SAFE_INTEGER;

			subsets.forEach(x => {
				let _distance = search(tsfc(x), tsfc(model));
				let __distance;

				if(_distance < distance) distance = _distance;
			})

      if(distance === 0) grading.push({name: x.name, url: x.url, distance, term, price: tsfc(x.price), shop: x.shop})

			if(i === object.length - 1){
				resolve(grading)
			}
		})
	})
}

function filterResults(object){
      return object.filter(x => {
        let text = x.name;
        return text.includes('cartridge') || 
        text.includes('toner')
      })
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



async function findTheBestPriceToners(link){

	let baseURL = 'https://shopping.google.com'

	return new Promise( async (resolve, reject) => {
	    let url = baseURL + link + '&sfr=compass&ei=DWTdYeK_G7qHytMPm7yLsAU&tbs=new%3A1';
	    let arr = url.split("epd");
	    arr[0] += ",scoring:tp,epd:"
	    url = arr.join("")
			axios.get(url).then( async res => {
				await resolve(res)
			}).catch(err => {
				reject(err)
			})
	})
}

async function run(){
	let toners = await Database.getInstance().promise().query("SELECT * FROM toner_details_final")

	toners = toners[0]

	for(let i = 0; i < toners.length; i++){
		let toner = toners[i]

		let model = toner['Model'] ? toner['Model'].toLowerCase() : ''
		let color = toner['Color'].toLowerCase()
		let name = toner['Name'].split(" - ")[0].toLowerCase()
		let matnr = toner['Matnr'];

		if(name.split(" ").length > 1){
			await searchAmazonToners(name, color, model, matnr)
			await timer(5000)
		}else{

		}
	}
}

async function searchAmazonToners(productName, color, model, matnr){

	return new Promise( async (resolve, reject) => {

		let term = productName;

		console.log(productName)
		console.log(color)
		console.log(model)
		console.log(matnr)

		try{
			res = await axios.get('https://www.amazon.com/s?k=' + term, {
				headers:{
				    'User-Agent':`Mozilla/5.0 (Macintosh; Intel Mac OS X ${randomIntFromInterval(23,65)}_${randomIntFromInterval(25,65)}_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36`
				}
			});
		}catch(e){
			console.log(e)
		}

		const $ = cheerio.load(res.data);

		let spans = $(".s-title-instructions-style").filter(function(){
			let text = $(this).find(".a-text-normal span").text().toLowerCase()

			return text.toLowerCase().includes('toner') || 
			text.toLowerCase().includes('cartridge')  
		});

		let objects = [];

		let _spans = [];

		spans.each(function(){
			let text = $(this).find(".a-text-normal span").text();
			let href = 'https://amazon.com' + $(this).find(".a-text-normal").attr('href');

			_spans.push({text,href});
		})

		await _spans.forEach(async function(x, i){

			let text = x.text;
			let subset = await __subsets.v2(text);


			let distance = Number.MAX_SAFE_INTEGER;

			subset.forEach(x => {
				distance = Math.min(search(tsfc(x),tsfc(model)), distance);
				//if(distance === 0 && tsfc(x).length !== tsfc(model).length) distance = 1;
			});

			let exactMatch = false;

			if(distance === 0) exactMatch = true;

			if(exactMatch){
				objects.push({
					text: x.text,
					url: x.href
				})
			}
		})

		let _prices = await findTheBestPriceAmazon(objects);

		_prices = _prices.filter(x => !Number.isNaN(x.price))

		console.log(_prices)

		resolve(_prices)
/*		Database.getInstance().query("INSERT INTO inventory (Matnr, Amazon) VALUES (?,?)", [matnr, JSON.stringify(_prices)], (err, result) => {
			if(err) {
				if(err.errno === 1062){
					Database.getInstance().query("UPDATE inventory SET Amazon = ? WHERE Matnr = ?", [JSON.stringify(_prices), matnr], (err, result) => {
						if(err) console.log(err);

						resolve(_prices)
					})
				}
			}

			resolve(_prices)
		})*/
	})
}

run()

module.exports = { searchGoogleToners, findTheBestPriceToners };