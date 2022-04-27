const search = require('../helpers/search');
const subsets = require('../helpers/subsets');
const tsfc = require('../helpers/transformStringForComparison');
const axios = require('axios');
const Database = require('../db/db');
const cheerio = require('cheerio');
const fs = require('fs');
const req = require('express/lib/request');
const AmazonEnums = require('../classes/AmazonEnums');

const timer = ms => new Promise(res => setTimeout(res, ms))

function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}


async function searchAmazon(productName, partNumber, matnr){

	let initialProductName = productName
	let initialPartNumber = partNumber
	let initialMatnr = matnr;

	if(partNumber.includes('#')){
		partNumber = partNumber.split("#")[0]
	}

	if(partNumber.includes('-')){
		partNumber = partNumber.split("-")[0]
	}

	return new Promise( async (resolve, reject) => {
		let arr = productName.split(" ");
		let model = arr[arr.length - 1];
		let brand = arr[0];

		arr.map(x => {
			if(x.includes('HL-')) model = x;
		})

		let term = brand + " " + model;

		if(model === 'All-in-One' || 
			model === 'All-In-One' ||
			model === 'PostScript' || 
			model === 'MFP' || 
			model === 'direct' || 
			model.toLowerCase() === 'printer' ||
			model.toLowerCase() === 'pack' ||
			model.toLowerCase().includes('tank') ){
			term = partNumber;
			model = partNumber;	
		}

		console.log(model)
		console.log(productName)
		console.log(term)
		let res;
		try{
			res = await axios.get('https://www.amazon.com/s?k=' + term, {
				headers:{
				    'User-Agent':`Mozilla/5.0 (Macintosh; Intel Mac OS X ${randomIntFromInterval(23,65)}_${randomIntFromInterval(25,65)}_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36`
				}
			});
		}catch(e){
			console.log(e)
		}


		if(!res){
			console.log('error')
			resolve([])
			return;	
		}
		const $ = cheerio.load(res.data);

		let spans = $(".s-title-instructions-style").filter(function(){
			let text = $(this).find(".a-text-normal span").text();

			return !text.toLowerCase().includes('drum') && 
			!text.toLowerCase().includes('toner') && 
			!text.toLowerCase().includes('cartridge') && 
			!text.toLowerCase().includes('bundle') && 
			!text.toLowerCase().includes('pack') &&
			!text.toLowerCase().includes('yield') &&
			!text.toLowerCase().includes("high") &&
			!text.toLowerCase().includes('roller') && 
			!text.toLowerCase().includes('bottle') && 
			!text.toLowerCase().includes('kit') && 
			!text.toLowerCase().includes('casing') &&
			!text.toLowerCase().includes('rfb') &&
			!text.toLowerCase().includes('refurbished')
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
			let subset = await subsets.v2(text);


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

		let _prices = await findTheBestPriceAmazon(objects)
		_prices = _prices.filter(x => !Number.isNaN(x.price))

		// _prices.push({
		// 	date: new Date().toUTCString()
		// })

		Database.getInstance().query("INSERT INTO inventory (Matnr, Amazon) VALUES (?,?)", [matnr, JSON.stringify(_prices)], (err, result) => {
			if(err) {
				if(err.errno === 1062){
					Database.getInstance().query("UPDATE inventory SET Amazon = ? WHERE Matnr = ?", [JSON.stringify(_prices), matnr], (err, result) => {
						if(err) console.log(err);

						resolve(_prices)
					})
				}
			}

			resolve(_prices)
		})
	})
}


function getRequestOptions(){
	return{
		headers:{
			'User-Agent':`Mozilla/5.0 (Macintosh; Intel Mac OS X ${randomIntFromInterval(25,55)}_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36`,
			'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
			'Accept-Encoding': 'gzip',
			'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
			'Upgrade-Insecure-Requests': '1',
		}
	}
}

async function simulateAjaxCall(asin, pageno){
	let link = `https://www.amazon.com/gp/product/ajax/ref=aod_page_1?asin=${asin}&pc=dp&isonlyrenderofferlist=true&experienceId=aodAjaxMain&pageno=${pageno}`;

	console.log(link)
	try{
		let res = await axios.get(link, getRequestOptions());
		const $ = cheerio.load(res.data)

		let $offers = $("#aod-offer")
		let sum = 0;

		let prices = [];

		$offers.each(function(){
			let shipping = $(this).find("#mir-layout-DELIVERY_BLOCK-slot-PRIMARY_DELIVERY_MESSAGE_LARGE span").data("csaCDeliveryPrice")
			let price = $(this).find(".a-offscreen").text()
			let state = $(this).find("#aod-offer-heading h5").text()

			if(state) state = state.trim()

			if(shipping === undefined || shipping.toLowerCase() === 'free' || shipping.toLowerCase() === '') shipping = 0

			if(typeof shipping === 'string') shipping = parseFloat(tsfc(shipping.substr(1)))
			if(typeof price === 'string') price = parseFloat(tsfc(price.substr(1)))

			console.log(shipping, price)
			let total =	parseFloat( (shipping + price).toFixed(2))

			if(Number.isNaN(total)) return true;
			prices.push({total, state});
			sum += total;

		})

		return [ prices, sum ]

	}catch(e){
		console.log(e)
	}
}

async function findTheBestPriceAmazon(objects){
	let _prices = [];
	return new Promise( (resolve, reject) => {
		if(objects.length === 0) resolve([]);

		objects.forEach(async (x, i) => {
				await timer(3000 * i);
				let { url, text } = x;

				try{
					let res = await axios.get(url, getRequestOptions())

					let $ = cheerio.load(res.data);

					//fs.writeFile('./debugHTML.txt', res.data, { flag: 'a+' }, err => {})

					// let p = $(".priceToPay").text().substr(1);
					// if(!p) p = $("[data-action='show-all-offers-display'] .a-color-price").text().substr(1);
					// if(!p) p = $(".a-price span").text().substr(1);
					let link = $("[data-action='show-all-offers-display'] a").attr("href")


					if(link){
						//fs.writeFile('./debugHTML.txt', res.data, { flag: 'a+' }, err => {})

						let asin = link.split('/')[3]

						let checkSum = 0;
						let i = 1;

						while(true){


							try{
								let [ prices, sum ] = await simulateAjaxCall(asin, i++)
								console.log(prices)
								if(Math.round(checkSum) === Math.round(sum)){
									break;
								}
	
								checkSum = sum;
	
								prices.forEach(x => {
									let { total, state } = x
	
									_prices.push({
										price: total, url, text, state
									})
								})
	
								await timer(3000)
							}catch(e){
								console.log(e);
								break;
							}
						}						
					}
					if(i === objects.length - 1) resolve(_prices)
				}catch(e){
					console.log(e)
					reject(e);
				}

		})
	})
}

module.exports = { searchAmazon, findTheBestPriceAmazon }