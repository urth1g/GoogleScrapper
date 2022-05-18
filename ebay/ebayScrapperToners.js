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


async function searchEbayToners(toner, filterFunction){


	return new Promise( async (resolve, reject) => {
        const model = toner['Model'] || 'Toner'
        const name = toner['Name']
        const color = toner['Color']
        const pack = toner['Pack']
        const printerNumber = toner['PrinterNumber']
        const matnr = toner['Matnr'];
    
        let term = name.split(" ")[0] + " " + model;
        let match = model;

		let res;

		try{
			let rand = randomIntFromInterval(12,35);
			let url = `https://www.ebay.com/sch/i.html?_nkw=${term}+printer&_sop=15`;
			res = await axios.get(url, {
				headers:{
				    'User-Agent':`Mozilla/5.0 (Macintosh; Intel Mac OS X ${randomIntFromInterval(12,35)}_${rand}_3) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/54.0.2840.71 Safari/537.36`
				}
			});
		}catch(error){
			console.log(error.response)
			resolve([])
		}

		console.log('beforeLoading')

		if(!res) {
			resolve([])
			return;
		}
		const $ = cheerio.load(res.data);

		console.log('loading')

		let spans = $(".s-item__info").filter(function(){
			let text = $(this).find(".s-item__title").text();
			let price = $(this).find(".s-item__price").text().substr(1);

            return filterFunction(text)
		});

		let objects = [];

		let _spans = [];

		spans.each(function(){
			let text = $(this).find(".s-item__title").text();
			let condition = $(this).find(".s-item__subtitle span").text();
			let price = $(this).find(".s-item__price").text().substr(1);
			let link = $(this).find(".s-item__link").attr("href");
			let shipping = $(this).find(".s-item__logisticsCost").text().trim()
			
			if( (shipping && shipping.toLocaleLowerCase().includes('free') ) || !shipping || shipping.includes('not specified') || shipping.includes('Freight')){
				shipping = 0;
			}else{
				try{
					shipping = shipping.match(/\$[\d|\.]*/g)[0]
					shipping = parseFloat(shipping.substr(1))
				}catch(e){
					console.log(e)
				}
			}

			price = parseFloat(tsfc(price))

			let sum = parseFloat(shipping+price)
			_spans.push({text, price: sum, link, state: condition, shipping });
		})

		await _spans.forEach(async function(x, i){

			let text = x.text;
			let subset = await subsets.v2(text);


			let isGenuine = (tsfc(text).includes("genuine") || tsfc(text).includes("original")) || !(tsfc(text).includes("replacement"));

			let distance = Number.MAX_SAFE_INTEGER;

			subset.forEach(x => {
				distance = Math.min(search(tsfc(x),tsfc(model)), distance);
			});

			let exactMatch = false;

			if(distance === 0) exactMatch = true;

			if(exactMatch){
				objects.push({
					text: x.text,
					price: x.price,
					link: x.link,
					state: x.state,
					isGenuine
				})
			}
		})


		let _prices = objects.map(x => x.price);

		Database.getInstance().query("INSERT INTO inventory (Matnr, Ebay, Amazon, Techdata) VALUES (?,?,?,?)", [matnr, JSON.stringify(objects), '[]', '[]'], (err, result) => {
			if(err) {
				if(err.errno === 1062){
					Database.getInstance().query("UPDATE inventory SET Ebay = ? WHERE Matnr = ?", [JSON.stringify(objects), matnr], (err, result) => {
						if(err) console.log(err);

						resolve(objects)
					})
				}
			}

			resolve(objects)
		})
	})
}



module.exports = { searchEbayToners }