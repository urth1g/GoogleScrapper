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


async function searchEbay(productName, partNumber, matnr){

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
			let url = `https://www.ebay.com/sch/i.html?_from=R40&_nkw=${term}`;
			console.log(url)
			res = await axios.get(url, {
				headers:{
				    'User-Agent':`Mozilla/5.0 (Macintosh; Intel Mac OS X 10_${randomIntFromInterval(12,49)}_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36`
				}
			});
		}catch(e){
			console.log(e)
			reject(e)
		}

		const $ = cheerio.load(res.data);


		let spans = $(".s-item__info").filter(function(){
			let text = $(this).find(".s-item__title").text();
			let price = $(this).find(".s-item__price").text().substr(1);
			let priceNum = null;

			try{
				priceNum = parseFloat(tsfc(price))
			}
			catch(e){
				console.log(e)
			}
//Epson WorkForce Pro WF-C5790 Wireless Color Inkjet All-in-One Printer		
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
			!text.toLowerCase().includes('refurbished') && 
			!text.toLowerCase().includes('charger') && 
			!text.toLowerCase().includes('cover') && 
			!text.toLowerCase().includes('ram') &&
			!text.toLowerCase().includes('unit') &&
			!text.toLowerCase().includes('cassette') && 
			!text.toLowerCase().includes('cd') &&
			!text.toLowerCase().includes('sewing') && 
			!text.toLowerCase().includes('tray') && 
			!text.toLowerCase().includes('cable') && 
			!text.toLowerCase().includes('fuser') &&
			!(text.toLowerCase().includes('lexmark') && text.toLowerCase().includes('58d')) &&
			!text.toLowerCase().includes('refill') &&
			!text.toLowerCase().includes('powder') &&
			!text.toLowerCase().includes('chip') &&
			!text.toLowerCase().includes('replacement') &&
			!text.toLowerCase().includes('developer') &&
			!text.toLowerCase().includes('cabinet') &&
			!(text.toLowerCase().includes('ink') && !text.toLowerCase().includes('jet')) &&
			!text.toLowerCase().includes('cartouche') && 
			!text.toLowerCase().includes('printhead') &&
			!text.toLowerCase().includes('motor') &&
			!(text.toLowerCase().includes('lexmark') && text.toLowerCase().includes('76c')) &&
			!(text.toLowerCase().includes('lexmark') && text.toLowerCase().includes('58d')) &&
			!(text.toLowerCase().includes('lexmark') && text.toLowerCase().includes('41x')) &&
			!(text.toLowerCase().includes('lexmark') && text.toLowerCase().includes('32c')) &&
			!(text.toLowerCase().includes('lexmark') && text.toLowerCase().includes('57x')) &&
			!(text.toLowerCase().includes('lexmark') && text.toLowerCase().includes('78c')) &&
			!(text.toLowerCase().includes('lexmark') && text.toLowerCase().includes('return')) &&
			!(text.toLowerCase().includes('lexmark') && text.toLowerCase().includes('25b')) &&
			!text.toLowerCase().includes('assembly') &&
			!text.toLowerCase().includes('role') &&
			//TODO: !text.toLowerCase().includes('for') &&
			!text.toLowerCase().includes('finisher') &&
			!text.toLowerCase().includes('drawers') &&
			!text.toLowerCase().includes('belt') &&
			!text.toLowerCase().includes('215a') &&
			!text.toLowerCase().includes('cyan') &&
			!text.toLowerCase().includes('setup') &&
			!text.toLowerCase().includes('board') &&
			!text.toLowerCase().includes('genuine') &&
			priceNum > 100
		});

		let objects = [];

		let _spans = [];

		if(spans.length === 0) resolve([]);

		spans.each(function(){
			let text = $(this).find(".s-item__title").text();
			let condition = $(this).find(".s-item__subtitle span").text();
			let price = $(this).find(".s-item__price").text().substr(1);

			if(condition.toLowerCase().includes("new") || condition.toLowerCase().includes("open")){
				_spans.push({text, price: parseFloat(tsfc(price)) });
			}

		})


		console.log(_spans)
		return;
		await _spans.forEach(async function(x, i){

			let text = x.text;
			let subset = await subsets.v2(text);


			let distance = Number.MAX_SAFE_INTEGER;

			subset.forEach(x => {


				if(x.includes('#')){
					 x = x.split('#')[0]
				}

				if(x.includes('-')){
					 x = x.split('-')[0]
				}


				distance = Math.min(search(tsfc(x),tsfc(model)), distance);
				//if(distance === 0 && tsfc(x).length !== tsfc(model).length) distance = 1;
			});

			let exactMatch = false;

			if(distance === 0) exactMatch = true;

			if(exactMatch){
				objects.push({
					text: x.text,
					price: x.price
				})
			}
		})


		console.log(objects);

		let _prices = objects.map(x => x.price);

		Database.getInstance().query("INSERT INTO inventory (Matnr, Ebay) VALUES (?,?)", [matnr, JSON.stringify(_prices)], (err, result) => {
			if(err) {
				if(err.errno === 1062){
					Database.getInstance().query("UPDATE inventory SET Ebay = ? WHERE Matnr = ?", [JSON.stringify(_prices), matnr], (err, result) => {
						if(err) console.log(err);

						resolve(result)
					})
				}
			}

			resolve(result)
		})
	})
}

function findTheBestPriceEbay(){

}


module.exports = { searchEbay, findTheBestPriceEbay }