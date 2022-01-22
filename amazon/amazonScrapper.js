const search = require('../helpers/search');
const subsets = require('../helpers/subsets');
const tsfc = require('../helpers/transformStringForComparison');
const axios = require('axios');
const Database = require('../db/db');
const cheerio = require('cheerio');

const timer = ms => new Promise(res => setTimeout(res, ms))

function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}


async function searchAmazon(productName, partNumber, matnr){

	return new Promise( async (resolve, reject) => {
		let arr = productName.split(" ");
		let model = arr[arr.length - 1];
		let brand = arr[0];

		arr.map(x => {
			if(x.includes('HL-')) brand = x;
		})
		let term = brand + " " + model;

		let res;
		try{
			res = await axios.get('https://www.amazon.com/s?k=' + term, {
				headers:{
				    'User-Agent':`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_${randomIntFromInterval(12,49)}_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36`
				}
			});
		}catch(e){
			console.log(e)
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

		console.log(objects)
		let _prices = await findTheBestPriceAmazon(objects);
		_prices = _prices.filter(x => !Number.isNaN(x))

		Database.getInstance().query("INSERT INTO inventory (Matnr, Amazon) VALUES (?,?)", [matnr, JSON.stringify(_prices)], (err, result) => {
			if(err) {
				if(err.errno === 1062){
					Database.getInstance().query("UPDATE inventory SET Amazon = ? WHERE Matnr = ?", [JSON.stringify(_prices), matnr], (err, result) => {
						if(err) console.log(err);

						resolve(result)
					})
				}
			}

			resolve(result)
		})
	})
}

async function findTheBestPriceAmazon(objects){
	let _prices = [];
	return new Promise( (resolve, reject) => {
		if(objects.length === 0) resolve([]);

		objects.forEach(async (x, i) => {
				console.log(x)
				console.log(i)
				console.log(objects.length - 1);
				await timer(2000 * i);
				let { url, text } = x;

				try{
					let res = await axios.get(url, {
						headers:{
						    'User-Agent':'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_10_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36',
							'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3',
							'Accept-Encoding': 'gzip',
							'Accept-Language': 'en-US,en;q=0.9,es;q=0.8',
							'Upgrade-Insecure-Requests': '1',
						}
					})

					let $ = cheerio.load(res.data);

					let p = $("[data-action='show-all-offers-display'] .a-color-price").text().substr(1);
					p = tsfc(p)
					_prices.push(parseFloat(p));

					if(i === objects.length - 1) resolve(_prices)
				}catch(e){
					console.log(e)
					reject(e);
				}

		})
	})
}

module.exports = { searchAmazon, findTheBestPriceAmazon }