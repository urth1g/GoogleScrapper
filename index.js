const cheerio = require('cheerio');
const http = require('http');
const axios = require('axios');
const mysql      = require('mysql2');
const express = require('express')
const app = express()
const port = 3030;
const Database = require('./db/db');
const { getAccessories } = require('./database_getters/accessories');
const { getPrinters } = require('./database_getters/printers');
const { searchGoogle, findTheBestPrice, findAverage } = require('./google/googleScrapper');
const { getFeedSheetData } = require('./google/getFeedSheetData');
const { searchAmazon, findTheBestPriceAmazon } = require('./amazon/amazonScrapper');
const { searchAmazonToners } = require('./amazon/amazonScrapperToners');
const { searchEbay, findTheBestPriceEbay } = require('./ebay/ebayScrapper');
const { searchEbayToners } = require('./ebay/ebayScrapperToners');
const { searchTechdata, setTechdataPrice } = require('./techdata/techdataScrapper');
const { getData } = require('./google/spreadsheets');
const { pricesFromTxt } = require('./pricesFromTxt/pricesFromTxt');
const fs = require('fs');
const cors = require('cors');
const searchGoogleToners = require('./scripts/getTonerPricesGoogle');
const PriceSetter = require('./classes/PriceSetter');
const { Console } = require('console');
const dailyUpdate = require ('./scripts/dailyUpdate');
const { calculateStandardDeviation } = require('./helpers/calculateStandardDeviation');
const { sendEmail } = require('./helpers/sendEmail');
const { opportunityTemplate } = require('./email_templates/templates');
const tsfc  = require('./helpers/transformStringForComparison');
const ServersQueue = require('./classes/ServersQueue');
require('dotenv').config();


// Ignore international items
// Also be the first shop after a matter of fax
// For techdata, always 2$ additional per item + shipping fee ( make a call based on weight to the UPS )
// Techdata - look into the availability as well. If the date for the item to become available is 3 days into the future, consider it. Also re-flush techdata sources everyday.
// Ebay - add printer and filter based on price 
// If the printer model ends with T (DWT) find the pricing for DW and add the cost of the tray
// Ignore in the future: BuyBizSupplies, School Specialty, Gov Group
// Send email to Jonathan https://www.faxexpress.com/printers/Brother/Brother-HL-L5200DWT?rfrc=GoogleShopping&rfrt=GoogleShopping_BrotherHLL5200DWT
// Setup a guard for google ads if the item is getting a lot of clicks and not being profitable. Profitable consists of several factors:
// Position on google, CPC, and net - cost price. 
// Crawl all of ebay and compare on page 4

const timer = ms => new Promise(res => setTimeout(res, ms))

function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}

app.use(cors({
	origin: '*'
}))

app.use(
  express.urlencoded({
    extended: true
  })
)

app.use(express.json())

let errLog = console.error;

console.error = function(msg){
	let toSend =  null;
	
	//sendEmail("jevremovicdjordje97@gmail.com", "Error", msg.stack)
	errLog.apply(console, arguments)
}


process
  .on('unhandledRejection', (reason, p) => {
	//sendEmail("jevremovicdjordje97@gmail.com", "Error", reason)
    console.error(reason, 'Unhandled Rejection at Promise', p);
  })
  .on('uncaughtException', err => {
	//sendEmail("jevremovicdjordje97@gmail.com", "Error", err.message)
    console.error(err, 'Uncaught Exception thrown');
  });

app.get('/crawl_accessories', async (req, res) => {


	let accessories = await getAccessories()

	accessories = accessories.filter(x => x.name !== '')

	let obj = {};

	let arr = [];

	accessories.forEach(x => {
		if(obj[x.printerNumber]){ 
			return true;
		}else{
			arr.push(x);
			obj[x.Matnr] = true
		}

	})


	//arr = arr.filter(x => x.name === 'HP - DDR3 - module - 1 GB - DIMM 90-pin - unbuffered');

	for(let i = 0; i < arr.length; i++){

		await timer(3000);

		searchGoogle(arr[i].name + " " + arr[i].MPN).then(res => {
			let __url = res[0]
			findTheBestPrice(res[0]).then( res => {
				let regex = /((?=\$)((?!=\"|\{|\}|\<|\]|delivery|[oO][fF][fF]|more).)+?(?=\<))|(Report a listing)/g;

				let matches = res.data.match(regex);

				let totalPriceNew = [];

				for(let i = 0; i < matches.length; i++){
					if(matches[i] === 'Report a listing' ) break;

					let price = parseFloat(matches[i].substr(1).replace(/\,/g, ""));
					if(i % 2 === 1) totalPriceNew.push(price)
				}

				totalPriceNew = totalPriceNew.map(x => {

					let num = x;
					num = x.toFixed(2);
					num = parseFloat(num)
					return num;
				})

				totalPriceNew.sort((a,b) => a - b);

				Database.getInstance().query("UPDATE accessories SET price = ? WHERE Matnr = ?", [totalPriceNew[0], arr[i].Matnr], (err, result) => {
					if(err) console.log(err)

					console.log(result)
				})

			let content = `Set price of ${arr[i].name} to ${totalPriceNew[0]} - ${__url} \n`;
			fs.writeFile('./writeToTxt.txt', content, { flag: 'a+' }, err => {})

			})
		})
	}

	res.send('ok')
})


function changePrice(price){
	if(price >= 1000){
		return +(price - randomIntFromInterval(5, 10)).toFixed(2);
	}else if(price < 1000 && price >= 750){
		return +(price - randomIntFromInterval(5,10)).toFixed(2);
	}else if(price < 750 && price >= 500){
		return +(price - randomIntFromInterval(5,10)).toFixed(2);
	}else if(price < 500 && price >= 300){
		return +(price - randomIntFromInterval(3,5)).toFixed(2);
	}else if(price < 300 && price >= 50){
		return +(price - randomIntFromInterval(5,10)).toFixed(2);
	}else if(price < 50){
		return +(price - randomIntFromInterval(0, 1)).toFixed(2);
	}
}

app.get('/crawl_google_printers', async (req, resp) => {


	let printers = await getPrinters()

	let obj = {};

	let arr = [];

	printers.forEach(x => {
		if(obj[x.Matnr]){ 
			return true;
		}else{
			arr.push(x);
			obj[x.Matnr] = true
		}

	})


	arr = arr.filter(x => !x.ShortName.includes('STI'));
	arr = arr.slice(415);

	//index = arr.findIndex(x => x.ShortName === 'Epson WorkForce Pro WF-C5710 - multifunction printer - color');

	for(let i = 0; i < arr.length; i++){

		let Matnr = arr[i].Matnr;
		let Name = arr[i].ShortName;

		let _Name = Name.split(" - ")[0];
		let splitted = _Name.split(" ");

		let brand = splitted[0];
		let model = splitted[splitted.length - 1];

		Name = `${brand} ${model}`

		console.log(i)
		await timer(8500);

		try{
			searchGoogle(Name, arr[i].mpn).then(async (url, skipPage4) => {

				if(url === 'Nothing found.') {
					await Database.getInstance().promise().query("INSERT INTO inventory_log VALUES(?,?,?,?,?)", [Matnr, Name, '[]', url, null])
					return;
				}
				if(url.price){
						await Database.getInstance().promise().query("UPDATE inventory_log SET Inventory = '[]' WHERE Matnr = ?", [Matnr]);
						let inventory = await Database.getInstance().promise().query("SELECT * FROM inventory WHERE Matnr = ?", [Matnr]);

						let newPrice = changePrice(parseFloat(url.price))
						let sources = [];

						try{
							Amazon = JSON.parse(inventory[0][0].Amazon);
							Ebay = JSON.parse(inventory[0][0].Ebay);
							Techdata = JSON.parse(inventory[0][0].Techdata);
						}catch(er){
							console.log(er)
						}

						if(Amazon) sources.push(...Amazon.map(x => x.price));
						if(Ebay) sources.push(...Ebay.map(x => x.price));
						if(Techdata) sources.push(...Techdata.map(x => x.price));

						sources.sort((a,b) => a - b);

						if(sources.length !== 0){
							newPrice = Math.round(parseFloat( ((sources[0] + 50) + ((sources[0]+50) * 0.045)) * 100)) / 100;
						}

						Database.getInstance().query("UPDATE products SET price = ? WHERE Matnr = ?", [newPrice, Matnr], (err, result) => {
							if(err) console.log(err)

					let content = `Set price of ${Name} to (${newPrice}) - 'First Page Google'\n
Amazon: ${JSON.stringify(Amazon)}\n
Ebay: ${JSON.stringify(Ebay)}\n
Techdata: ${JSON.stringify(Techdata)}\n\n
`;
						fs.writeFile('./writeToTxt.txt', content, { flag: 'a+' }, err => {})

						})
					return;
				}else if(skipPage4 && !url){
					return;
				}

				try{
					findTheBestPrice(url).then( async res => {

						
						//let regex = /((?=\$)((?!=\"|\{|\}|\<|\]|delivery|[oO][fF][fF]|more).)+?(?=\<))|(Report a listing)/g;
						let regex = /<td>Total price.+?\$(.+?)</g;
						let regex2 = /<span class="[a-zA-Z]{6}">((?:(?!img).)+?)</g;

						//fs.writeFile('./writeToTxt.txt', res.data, { flag: 'a+' }, err => {})
						let matches = res.data.match(regex);
						let matches2 = regex2.exec(res.data);
						let matches3 = regex.exec(res.data);


						let totalPriceNew = [];
						let shops = [];

						if(!matches) {
							let content = `Nothing was found for ${arr[i].ShortName}.\n`;
							fs.writeFile('./writeToTxt.txt', content, { flag: 'a+' }, err => {})
							return;
						}


						do{
							shops.push(matches2[1]);
						}
						while((matches2 = regex2.exec(res.data)) !== null)

						let _shops = [...shops];

						do{
							let price = parseFloat(matches3[1].replace(/\,/g, ""));
							totalPriceNew.push({price, shop: shops.shift()})
						}while((matches3 = regex.exec(res.data)) !== null)

						let amoFaxExists = totalPriceNew.filter(x => x.shop === 'A Matter of Fax').length === 1;

						totalPriceNew = totalPriceNew.filter(x => x.shop !== 'Amofax');

						totalPriceNew.sort( (a,b) => a.price - b.price);

						let shopToBeat = null;
						let average = 0;
						let modifier = 55;

						if(amoFaxExists){
							let index = totalPriceNew.findIndex(x => x.shop === 'A Matter of Fax');

							console.log('exists')
							shopToBeat = totalPriceNew[index + 2];

							if(!shopToBeat) shopToBeat = totalPriceNew[index + 1]

							if(index === totalPriceNew.length - 1) {
								shopToBeat = totalPriceNew[index]
								shopToBeat.price = shopToBeat.price + 80;
								shopToBeat.price = +shopToBeat.price.toFixed(2)
							}

						}else{
							let medians = [
								-5,
								-7,
								-12.91,
								-147.59,
								-298.15,
								-494.96
							]

							average = findAverage(totalPriceNew);
							modifier = 55;

							if(average > 4000){
								modifier = medians[5]
							}else if(average > 2000 && average <= 4000){
								modifier = medians[4]
							}else if(average > 1000 && average <= 2000){
								modifier = medians[3]
							}else if (average > 750 && average <= 1000){
								modifiers = medians[2]
							}else if(average > 500 && average <= 750){
								modifiers = medians[1]
							}else if(average > 350 && average <= 500){
								modifier = medians[0]
							}
						}

						let newPrice = 0;


						let Amazon;
						let Ebay;
						let Techdata;

						if(shopToBeat){
							newPrice = changePrice(shopToBeat.price);
							newPrice = Math.round(parseFloat(newPrice * 100)) / 100
						}else{
							newPrice = changePrice(totalPriceNew[0].price);
							newPrice = Math.round(parseFloat(newPrice * 100)) / 100


							let inventory = await Database.getInstance().promise().query("SELECT * FROM inventory WHERE Matnr = ?", [arr[i].Matnr]);

							let sources = [];

							try{
								Amazon = JSON.parse(inventory[0][0].Amazon);
								Ebay = JSON.parse(inventory[0][0].Ebay);
								Techdata = JSON.parse(inventory[0][0].Techdata);
							}catch(e){
								console.log(e)
							}

							if(Amazon) sources.push(...Amazon.map(x => x.price));
							if(Ebay) sources.push(...Ebay.map(x => x.price));
							if(Techdata) sources.push(...Techdata.map(x => x));

							sources.sort((a,b) => a - b);

							console.log(sources)
							if(sources.length !== 0){
								newPrice = Math.round(parseFloat( ((sources[0] + 50) + ((sources[0]+50) * 0.045)) * 100)) / 100;
							}
						}

						console.log(newPrice)
						if(Number.isNaN(newPrice)) return;


						Database.getInstance().query("UPDATE products SET price = ? WHERE Matnr = ?", [newPrice, Matnr], (err, result) => {
							if(err) console.log(err)

							console.log(result)
						})

					let content = `Set price of ${arr[i].ShortName} to (${newPrice}) - ${url}\n
List of prices ${JSON.stringify(totalPriceNew)}\n\n
Amazon: ${JSON.stringify(Amazon)}\n
Ebay: ${JSON.stringify(Ebay)}\n
Techdata: ${JSON.stringify(Techdata)}\n\n
`;
					fs.writeFile('./writeToTxt.txt', content, { flag: 'a+' }, err => {})

					})
				}catch(e){
					console.log(e)
				}
			})
		}catch(e){
			console.log(e)
		}
	}

	resp.send('ok')
})


app.get('/spreadsheets', (req,res) => {
	getData();
	res.send('ok')
})

app.get('/pricesFromTxt', (req,res) => {
	pricesFromTxt();
	res.send('ok')
})

app.get('/shops', async (req, res) => {
	let query = "SELECT products_filter_list.ShopsToFilter, products_filter_list.Shops, products.Matnr, products.ShortName, products.Price FROM products_filter_list INNER JOIN products on products_filter_list.Matnr = products.Matnr GROUP BY products.Matnr, products.Price, products_filter_list.ShopsToFilter, products_filter_list.Shops, products.ShortName";
	Database.getInstance().query(query, (err,result) => {
		if(err) console.log(err)

		let obj = {}


		let obj350500 = []
		let obj500750 = [];
		let obj7501000 = [];
		let obj10002000 = [];
		let obj20004000 = [];
		let obj4000 = [];

		result.forEach(x => {
			let avg = 0;
			let shops = JSON.parse(x.ShopsToFilter);

			if(shops.length !== 0 ) return;

			shops.forEach(x => {
				if(x.indexOf('eBay') >= 0) x = 'eBay'

				if(!obj[x]) obj[x] = 1;
				else obj[x] = obj[x] + 1;
			})	

			let prices = JSON.parse(x.Shops);

			if(prices.length === 1) return;

			let amoFaxPrice = prices.filter(x => x.shop === 'A Matter of Fax')[0].price
			//prices = prices.filter(x => x.shop !== 'A Matter of Fax');
/*			let index = prices.findIndex(x => x.shop === 'A Matter of Fax');
			prices[index+2] ? console.log(prices[index+2]) : console.log(prices[index])
			return;*/

			prices.forEach(x => {
				avg += x.price
			})

			let num = avg / prices.length;

			let obj2 = {}

			let __num = +num.toFixed(2);



			let difference = amoFaxPrice - __num;

			let toPush = shops.length !== 0 ? shops : prices
			if(__num > 4000){
				obj4000.push(difference)
			}else if(__num > 2000 && __num <= 4000){
				console.log('2000 to 4000 range')
				obj20004000.push(difference)
			}else if(__num > 1000 && __num <= 2000){
				console.log('1000 to 2000 range')
				obj10002000.push(difference)
			}else if (__num > 750 && __num <= 1000){
				console.log('750 to 1000 range')
				obj7501000.push(difference)
			}else if(__num > 500 && __num <= 750){
				console.log('500 to 750 range');
				obj500750.push(difference)
			}else if(__num > 350 && __num <= 500){
				console.log('350 to 500 range')
				obj350500.push(difference)
			}

			console.log(`${num.toFixed(2)} for ${x.ShortName} - current price ${amoFaxPrice}`);
			console.log(`difference: ${difference} \n`);

			console.log(prices)
		})

/*		console.log(obj350500.sort((a,b) => a - b)[Math.floor(obj350500.length / 2)])
		console.log(obj500750.sort((a,b) => a - b)[Math.floor(obj500750.length / 2)])
		console.log(obj7501000.sort((a,b) => a - b)[Math.floor(obj7501000.length / 2)])
		console.log(obj10002000.sort((a,b) => a - b)[Math.floor(obj10002000.length / 2)])
		console.log(obj20004000.sort((a,b) => a - b)[Math.floor(objWPL04000.length / 2)])
		console.log(obj4000.sort((a,b) => a - b)[Math.floor(obj4000.length / 2)])*/
		console.log(obj)
		res.send('ok')
	})
});


app.get('/crawl_amazon_printers', async (req, res) => {
	let printers = await Database.makeQuery("SELECT * FROM products WHERE SubClass LIKE '%Laser%' OR ( SubClass LIKE '%Multifunction%' AND LongName LIKE '%Laser%' ) GROUP BY products.Matnr ORDER BY products.Price");

	printers = printers[0]

	printers = printers.filter(x => !x.ShortName.includes('STI'));

	let index = printers.findIndex(x => x.ShortName.toLowerCase().includes('m681f'));

	for(let i = 251; i < printers.length; i++){
		let int = randomIntFromInterval(6333,7589);
		let p1 = timer(int);

		let name = printers[i].ShortName;
		let mpn = printers[i].mpn;
		let matnr = printers[i].Matnr;
		let p2 = searchAmazon(name.split(" - ")[0], mpn, matnr);

		await Promise.all([p1, p2]).then( res => {
			console.log(int)
			console.log('Promise resolved for ' + i);
		})
	}
})

app.post('/crawl_amazon_printer', async (req,res) => {
	let { matnr } = req.body;

	let printer = await Database.makeQuery2("SELECT * FROM products WHERE Matnr = ?", [matnr])

	if(printer.length === 0) {
		res.send('err')
		return
	}

	printer = printer[0]
	let name = printer.ShortName;
	let mpn = printer.mpn;

	let prices = await searchAmazon(name.split(" - ")[0], mpn, matnr, name)

	res.send(prices);
})

app.post("/crawl_for_printer", async (req, resp) => {
	let matnr = req.body.matnr;

	let printer = await Database.makeQuery2("SELECT * FROM products WHERE Matnr = ?", [matnr])

	if(printer.length === 0) {
		resp.send('err')
		return
	}

	let Matnr = printer[0].Matnr;
	let Name = printer[0].ShortName;

	let _Name = Name.split(" - ")[0];
	let splitted = _Name.split(" ");

	let brand = splitted[0];
	let model = null;

	let m = await Database.makeQuery2("SELECT * FROM models_information WHERE Matnr = ?", [matnr])

	model = m[0].Model

	Name = `${brand} ${model}`

	console.log(Name)
	try{
		await searchGoogle(Name, printer[0].mpn, printer[0].ShortName, model).then(async (url, skipPage4) => {
			if(url === 'Nothing found.') {
				try{
					await Database.makeQuery2("INSERT INTO inventory_log VALUES(?,?,?,?,?)", [Matnr, Name, JSON.stringify('[]'), url, null])
				}catch(err){
					if(err.errno === 1062){
						await Database.makeQuery2("UPDATE inventory_log SET Inventory = ?, Link = ? WHERE Matnr = ?", [
							'[]',
							url,
							Matnr
						])

						console.log('updated')
					}
				}
			
				let priceSetter = new PriceSetter([], Matnr)
				let sources = await priceSetter.getSourcesNetPrices(Matnr);

				sources = sources.filter(x => x.state.toLowerCase().includes('new') || x.state.toLowerCase().includes('open') )
				if(sources.length === 0){
					resp.send({error: 'Nothing found. Price unchanged.'})
					return;
				}else{
					try{
						await Database.setProductPrice(Matnr, sources[0].net)
						resp.send({ok:true, newPrice: sources[0].getSourcesNetPrices})
						return;
					}catch(e){
						console.log(e)
						resp.send({error: e})
					}
				}

				return;
			}
			if(url.price){
				(async function(){
					await Database.getInstance().promise().query("UPDATE inventory_log SET Inventory = '[]' WHERE Matnr = ?", [Matnr]);
					let inventory = await Database.getInstance().promise().query("SELECT * FROM inventory WHERE Matnr = ?", [Matnr]);

					let newPrice = changePrice(parseFloat(url.price))
					let sources = [];

					try{
						Amazon = JSON.parse(inventory[0][0].Amazon);
						Ebay = JSON.parse(inventory[0][0].Ebay);
						Techdata = JSON.parse(inventory[0][0].Techdata);
					}catch(er){
						console.log(er)
					}

					if(Amazon) sources.push(...Amazon.map(x => x.price));
					if(Ebay) sources.push(...Ebay.map(x => x.price));
					if(Techdata) sources.push(...Techdata.map(x => x));

					sources.sort((a,b) => a - b);

					if(sources.length !== 0){
						//newPrice = Math.round(parseFloat( ((sources[0] + 50) + ((sources[0]+50) * 0.045)) * 100)) / 100;
					}

					Database.getInstance().query("UPDATE products SET price = ? WHERE Matnr = ?", [newPrice, Matnr], (err, result) => {
						if(err) console.log(err)

						console.log(result)
					})
				})();
				resp.send([])
				return;
			}else if (skipPage4 && !url){
				resp.send([])
				return;
			}

			try{
				await findTheBestPrice(url).then( async res => {
					console.log('Finding the best price')
					//let regex = /((?=\$)((?!=\"|\{|\}|\<|\]|delivery|[oO][fF][fF]|more).)+?(?=\<))|(Report a listing)/g;
					let regex = /<td>Total price.+?\$(.+?)</g;
					let regex2 = /<span class="[a-zA-Z]{6}">((?:(?!img).)+?)</g;

					//fs.writeFile('./writeToTxt.txt', res.data, { flag: 'a+' }, err => {})
					let matches = res.data.match(regex);
					let matches2 = regex2.exec(res.data);
					let matches3 = regex.exec(res.data);


					let totalPriceNew = [];
					let shops = [];

					if(!matches) {
						try{
							await Database.getInstance().promise().query("INSERT INTO inventory_log VALUES(?,?,?,?,?)", [Matnr, Name, JSON.stringify('[]'), url, null])
						}catch(err){
							if(err.errno === 1062){
								await Database.getInstance().promise().query("UPDATE inventory_log SET Inventory = ?, Link = ? WHERE Matnr = ?", [
									'[]',
									url,
									Matnr
								])
		
								console.log('updated')
							}
						}
						
						resp.send({error: 'No price found.'})
						return
					}

					do{
						shops.push(matches2[1]);
					}
					while((matches2 = regex2.exec(res.data)) !== null)

					let _shops = [...shops];

					do{
						let price = parseFloat(matches3[1].replace(/\,/g, ""));
						totalPriceNew.push({price, shop: shops.shift()})
					}while((matches3 = regex.exec(res.data)) !== null)

					totalPriceNew.sort((a,b) => a.price - b.price)

					console.log('shops')
					console.log(totalPriceNew)
					let priceSetter = new PriceSetter(totalPriceNew, Matnr);

					try{
						await Database.getInstance().promise().query("INSERT INTO inventory_log VALUES(?,?,?,?,?)", [Matnr, Name, JSON.stringify(totalPriceNew), url, null])
					}catch(err){
						console.log(err)
						if(err.errno === 1062){
							await Database.getInstance().promise().query("UPDATE inventory_log SET Inventory = ?, Link = ? WHERE Matnr = ?", [
								JSON.stringify(totalPriceNew),
								url,
								Matnr
							])

							console.log('updated')
						}
					}

					let amoFaxExists = totalPriceNew.filter(x => x.shop === 'A Matter of Fax').length === 1;

					totalPriceNew = totalPriceNew.filter(x => x.shop !== 'Amofax' && x.shop !== 'Amofax.com');

					let shopToBeat = null;
					let average = 0;

					if(amoFaxExists){
						let index = totalPriceNew.findIndex(x => x.shop === 'A Matter of Fax');

						shopToBeat = totalPriceNew[index + 1];

						if(index === totalPriceNew.length - 1) {
							shopToBeat = totalPriceNew[index]
							shopToBeat.price = shopToBeat.price + 10;
							shopToBeat.price = parseFloat(shopToBeat.price.toFixed(2))
						}

					}


					let newPrice = 0;

					let Amazon;
					let Ebay;
					let Techdata;

					if(shopToBeat){
						newPrice = changePrice(shopToBeat.price);
						newPrice = Math.round(parseFloat(newPrice * 100)) / 100
						//newPrice = priceSetter.price
					}else{
						await priceSetter.filterShopsBasedOnIgnoreList()
						await priceSetter.filterShopsBasedOnSources(Matnr)
						await priceSetter.applyMargins() 
						newPrice = parseFloat(priceSetter.price.toFixed(2))
					}

					
					if(Number.isNaN(newPrice)) return;

					Database.getInstance().query("UPDATE products SET price = ? WHERE Matnr = ?", [newPrice, Matnr], (err, result) => {
						if(err) console.log(err)

						console.log(result)
					})


					resp.send({ok: true, newPrice: newPrice})
				})
			}catch(e){
				console.log(e)
				resp.send({error: e.message})
			}
		})
	}catch(e){
		console.log(e)
	}

})

app.get('/crawl_ebay_printers', (req, res) => {

	(async () => {
		let printers = await Database.makeQuery("SELECT * FROM products WHERE SubClass LIKE '%Laser%' OR ( SubClass LIKE '%Multifunction%' AND LongName LIKE '%Laser%' ) GROUP BY products.Matnr ORDER BY products.Price");

		printers = printers[0]

		printers = printers.filter(x => !x.ShortName.includes('STI'));

		for(let i = 0; i < printers.length; i++){
			let int = randomIntFromInterval(3555,5323);
			console.log(i)
			await timer(int);

			let name = printers[i].ShortName;
			let mpn = printers[i].mpn;
			let matnr = printers[i].Matnr;
			try{
				let b = searchEbay(name.split(" - ")[0], mpn, matnr);
			}catch(e){
				console.log(e)
			}
		}
	})()

	res.send('ok')
});

app.post('/crawl_ebay_printer', async (req, res) => {
	let { matnr } = req.body;

	let printer = await Database.makeQuery2("SELECT * FROM products WHERE Matnr = ?", [matnr])

	console.log(printer)
	if(printer.length === 0) {
		res.send('err')
		return
	}

	console.log(printer[0])
	printer = printer[0]
	let name = printer.ShortName;
	let mpn = printer.mpn;

	let prices = await searchEbay(name.split(" - ")[0], mpn, matnr, name);

	res.send(prices)
})

app.get('/crawl_ebay_links', async (req, res) => {

})

app.get('/techdata_test', (req, res) => {
	setTechdataPrice('11209612')
})

app.get('/create_crawl_logs_from_txt', async (req, res) =>{
	try{
		const data = fs.readFileSync('./writeToTxt.txt', 'utf8')

		let regex = /Set\sprice\sof\s(.+?) -.+?(\/shopping.*?)\n\nList of prices (.+?\])/g
		
		let matches = regex.exec(data);

		do{
			let name = matches[1];
			let link = matches[2]
			let list = matches[3];

			let Matnr = await Database.getInstance().promise().query(`SELECT Matnr FROM products WHERE ShortName LIKE '%${name}%'`)

			Matnr[0].forEach(async x =>{
				let res = await Database.getInstance().promise().query("INSERT INTO inventory_log VALUES(?,?,?,?)",[x.Matnr, name, JSON.stringify(list), link])
				if(res){
					console.log('Inserted')
				}
			})
		}while( ( matches = regex.exec(data) ) !== null)
	}catch(e){
		console.log(e)
	}

	res.send('ok')
})

app.post('/crawl_google_toner', async (req, resp) => {
	let { matnr } = req.body

	let toner = await Database.makeQuery("SELECT * FROM toner_details_final WHERE Matnr = ?", [matnr])

	toner = toner[0]
	toner = toner.length > 0 ? toner[0] : false

	if(!toner){
		console.log('not-found')
		resp.send('false')
		return
	}

	const model = toner['Model'] || 'Toner'
	const name = toner['Name']
	const color = toner['Color']
	const pack = toner['Pack']
	const printerNumber = toner['PrinterNumber']

	let term = name.split(" ")[0] + " " + model;
	let match = model;

	let filterFunction = x => {
		if(x.url.includes("/review")) return false
	}

	if(pack){
		filterFunction = x => {
			let _pack = tsfc(pack).replaceAll(/pack/g, "pk")

			if(x.url.includes("/review")) return false

			let text = tsfc(x.name)
			let includesPack = text.includes(tsfc(pack)) || text.includes(_pack) || text.includes('packof2')

			return includesPack
		}
	}
	
	console.log('Toner name: ', name)

	let shopsToExclude = {}

	shopsToExclude['PC &amp; More'] = true
	shopsToExclude['A Matter of Fax'] = true 
	shopsToExclude['Amofax'] = true 

	console.log('got-here')
	let res = await searchGoogleToners(term, match, filterFunction, shopsToExclude, toner)

	resp.send('ok')
});

app.get('/crawl_google_toner', async (req, resp) => {
	let { matnr } = req.query;

	let toner = await Database.makeQuery("SELECT * FROM toner_details_final WHERE Matnr = ?", [matnr])

	toner = toner[0]
	toner = toner.length > 0 ? toner[0] : false

	if(!toner){
		resp.send('false')
		return
	}

	const model = toner['Model']
	const name = toner['Name']
	const color = toner['Color']
	const pack = toner['Pack']
	const printerNumber = toner['PrinterNumber']

	let term = name.split(" ")[0] + " " + model;
	let match = model;

	let filterFunction = f => f

	if(pack){
		filterFunction = x => {
			let _pack = tsfc(pack).replaceAll(/pack/g, "pk")

			let text = tsfc(x.name)
			let includesPack = text.includes(tsfc(pack)) || text.includes(_pack) || text.includes('packof2')

			return includesPack
		}
	}
	
	console.log('Toner name: ', name)

	let shopsToExclude = {}

	shopsToExclude['PC &amp; More'] = true
	shopsToExclude['A Matter of Fax'] = true 
	shopsToExclude['Amofax'] = true 

	let res = await searchGoogleToners(term, match, filterFunction, shopsToExclude, toner)

	resp.send('ok')
});

app.post("/set_price_from_logs", async (req,resp) => {

	let res = await Database.makeQuery("SELECT * FROM products WHERE SubClass LIKE '%Laser%' OR ( SubClass LIKE '%Multifunction%' AND LongName LIKE '%Laser%' ) GROUP BY products.Matnr ORDER BY products.Price");

	let printers = res[0]

	resp.setHeader("Transfer-Encoding", "chunked");
	resp.setHeader('Content-Type', 'text/html; charset=UTF-8')


	for(let i = 0; i < printers.length; i++){
		let matnr = printers[i].Matnr;

		let shouldCancel = await Database.makeQuery2("SELECT * FROM configuration WHERE action = ?", ['scrapping_enabled']);

		console.log(shouldCancel)
		shouldCancel = shouldCancel[0]

		if(Number(shouldCancel.value) === 0 ) break;
		
		try{
			let res = await axios.post('http://localhost:3030/crawl_for_printer', {matnr})
			if(res.data.ok) resp.write(JSON.stringify({...res.data, index: i}))
			if(res.data.error) resp.write(JSON.stringify({index: i, error: res.data.error}))
		}catch(e){
			console.log(e)
		}

		await timer(3000)

	}

	resp.end()
})

app.post("/admin/enable_gpcw", async(req,resp) => {
	try{
		await Database.makeQuery2("UPDATE configuration SET value = 1 WHERE action = 'scrapping_enabled'")
		resp.send({message: 'Global Price Configuration Wizard Enabled.'})
	}catch(e){
		resp.send({error: 'Unexpected error occured.'})
	}
})

app.post("/admin/disable_gpcw", async(req,resp) => {
	try{
		await Database.makeQuery2("UPDATE configuration SET value = 0 WHERE action = 'scrapping_enabled'")
		resp.send({message: 'Global Price Configuration Wizard Disabled.'})
	}catch(e){
		resp.send({error: 'Unexpected error occured.'})
	}
})

app.get("/statistics", async (req,resp) => {
	let res = await Database.makeQuery("SELECT * FROM products WHERE SubClass LIKE '%Laser%' OR ( SubClass LIKE '%Multifunction%' AND LongName LIKE '%Laser%' ) GROUP BY products.Matnr ORDER BY products.Price");

	let printers = res[0]

	let keys = {}
	for (const printer of printers){
		let matnr = printer.Matnr;

		let res = await Database.makeQuery("SELECT * FROM inventory_log WHERE Matnr = ? ", [matnr])
		res = res[0]
		if(res.length === 0) continue;

		let feed = JSON.parse(res[0].Inventory) 

		if(typeof feed === 'string') feed = JSON.parse(feed)

		if(!feed) continue;

		feed.push({shop: 'Amofax', price: printer.Price})


		feed.sort((a,b) => a.price - b.price)

		let index = feed.findIndex(x => x.shop === 'Amofax');

		if(index === 0) {
			console.log(feed)
		}

		if(!keys[index]) keys[index] = 1
		else keys[index] = keys[index] + 1;

		//await timer(5000)
	}

	resp.send(JSON.stringify(keys))
})


app.get('/trigger_daily_update', async (req,res) => {
	dailyUpdate()
	res.send('started')
})

app.post("/crawl_techdata_printer", async (req,resp) => {
	let { matnr } = req.body;
	let prices = await setTechdataPrice(matnr)
	console.log('sending prices')
	resp.send(prices)
});

app.get("/set_techdata_availability", async (req,resp) => {
	let res = await Database.makeQuery("SELECT * FROM products WHERE SubClass LIKE '%Laser%' OR ( SubClass LIKE '%Multifunction%' AND LongName LIKE '%Laser%' ) GROUP BY products.Matnr ORDER BY products.Price");

	let printers = res[0]

	let index = printers.findIndex(x => x.Matnr === 13174785);

	for(let i = 0; i < printers.length; i++){
		let matnr = printers[i].Matnr;
		
		try{
			let res = await setTechdataPrice(matnr)
			console.log(matnr)
		}catch(e){
			console.log(e)
		}

		await timer(3000)

	}

	resp.end()
})

app.get('/test-email', async (req,resp) => {

	let res = await Database.makeQuery("SELECT * FROM products WHERE SubClass LIKE '%Laser%' OR ( SubClass LIKE '%Multifunction%' AND LongName LIKE '%Laser%' ) GROUP BY products.Matnr ORDER BY products.Price");
	let printers = res[0]

	for(let i = 0; i < 6; i++){
		let Matnr = printers[i].Matnr

		let { data } = await axios.post('http://localhost:8080/admin/get_inventory', {Matnr})
		let response = await axios.post('http://localhost:8080/log_info', {matnr: Matnr})

		let page4Link = "https://google.com" + response.data[0].Link
		let feed = JSON.parse(response.data[0].Inventory)
		let { combinedSources } = data;


		if(combinedSources.length === 0 || feed.length === 0) return false 

		combinedSources = combinedSources.filter(x => (!x.state.toLowerCase().includes('like')) && (x.state.toLowerCase().includes('new') || x.state.toLowerCase().includes('open')))

		if(combinedSources.length === 0) return false 

		let mappedFeed = feed.map(x => x.price)
		let mappedSources = combinedSources.map(x => x.computed.net)

		let multiplier = 0.83;

		let feedPrice = mappedFeed[0];
		let sourcePrice = mappedSources[0];

		if(feedPrice > 3000) multiplier = 0.88;
		if(feedPrice > 4700) multiplier = 0.95;

		let templateMsg = opportunityTemplate(combinedSources[0], feed, page4Link)
		if(sourcePrice < feedPrice * multiplier){
			//await sendEmail("jevremovicdjordje97@gmail.com", `Possible Opportunity - ${combinedSources[0].source}`, templateMsg)
		}
	}

	resp.send('ok')
})

app.post("/check_for_good_deals", async (req,resp) => {
	let { matnr } = req.body;

	console.log('checking for good deals');
	let { data } = await axios.post(`${process.env.BACKEND_ENDPOINT_URL}/admin/get_inventory`, {Matnr: matnr})
	let response = await axios.post(`${process.env.BACKEND_ENDPOINT_URL}/log_info`, {matnr})

	console.log('step1')
	if(!response.data[0]) {
		resp.send('not ok')
		return;
	}
	let page4Link = "https://google.com" + response.data[0].Link
	let feed = JSON.parse(response.data[0].Inventory)
	let { combinedSources } = data;

	console.log('step2')
	if(combinedSources.length === 0 || feed.length === 0) {
		resp.send('false')
		return;
	} 

	combinedSources = combinedSources.filter(x => x.state).filter(x => (!x.state.toLowerCase().includes('like')) && (x.state.toLowerCase().includes('new') || x.state.toLowerCase().includes('open')))

	console.log('step3')
	if(combinedSources.length === 0) {
		resp.send('false')
		return;
	}
	
	console.log('step4')
	let mappedFeed = feed.map(x => x.price)
	let mappedSources = combinedSources.map(x => x.computed.net)

	let multiplier = 0.8;

	let feedPrice = mappedFeed[0];
	let sourcePrice = mappedSources[0];

	if(feedPrice > 3000) multiplier = 0.85;
	if(feedPrice > 4700) multiplier = 0.9;

	let templateMsg = opportunityTemplate(combinedSources[0], feed, page4Link)
	if(sourcePrice < feedPrice * multiplier){
		await sendEmail("jevremovicdjordje97@gmail.com", `Possible Opportunity - ${combinedSources[0].source}`, templateMsg)
	}
	
	resp.send('ok')
})
app.post('/update_spreadsheet_price', async (req,resp) => {
	let { matnr } = req.body;

	try{
		let printer = await Database.makeQuery2("SELECT * FROM products WHERE Matnr = ?", [matnr]);
		if(!printer || printer.length === 0) throw new Error("Unable to find requested printer.");

		printer = printer[0]

		let rows = await getFeedSheetData();
	
		let link = "https://amofax.com/item/" + printer.Matnr
		let row = rows.filter(x => x.link === link)

		if(!row || row.length === 0) throw new Error("Unable to find printer in feed catalog.")

		row = row[0]

		row.price = printer.Price + " USD";
		await row.save();
		resp.send('ok')
	}catch(e){
		console.log(e);
	}

});

app.get('/crawl_google_toner', async (req, resp) => {
	let { matnr } = req.body

	let toner = await Database.makeQuery("SELECT * FROM toner_details_final WHERE Matnr = ?", [matnr])

	toner = toner[0]
	toner = toner.length > 0 ? toner[0] : false

	console.log(toner)
	if(!toner){
		resp.send('false')
		return
	}

	const model = toner['Model'] || 'Toner'
	const name = toner['Name']
	const color = toner['Color']
	const pack = toner['Pack']
	const printerNumber = toner['PrinterNumber']

	let term = name.split(" ")[0] + " " + model;
	let match = model;

	let filterFunction = f => f

	if(pack){
		filterFunction = x => {
			let _pack = tsfc(pack).replaceAll(/pack/g, "pk")

			let text = tsfc(x.name)
			let includesPack = text.includes(tsfc(pack)) || text.includes(_pack) || text.includes('packof2')

			return includesPack
		}
	}
	
	console.log('Toner name: ', name)

	let shopsToExclude = {}

	shopsToExclude['PC &amp; More'] = true
	shopsToExclude['A Matter of Fax'] = true 
	shopsToExclude['Amofax'] = true 

	let res = await searchGoogleToners(term, match, filterFunction, shopsToExclude, toner)

	resp.send('ok')
});

app.post('/crawl_amazon_toner', async (req, resp) => {
	let { matnr } = req.body;

	console.log(matnr)
	let toner = await Database.makeQuery("SELECT * FROM toner_details_final WHERE Matnr = ?", [matnr])

	toner = toner[0]
	toner = toner.length > 0 ? toner[0] : false

	if(!toner){
		console.log('not found')
		resp.send('false')
		return
	}

	let filterFunction = f => f;

	let checkForKeywords = x => {
		return x.includes('toner') || x.includes('cartridge')
	}

	filterFunction = checkForKeywords
	let pack = toner['Pack']

	if(pack){
		let checkForPack = x => {
			let _pack = tsfc(pack).replaceAll(/pack/g, "pk")

			let text = tsfc(x)
			let includesPack = text.includes(tsfc(pack)) || text.includes(_pack) || text.includes('packof2')

			return includesPack
		}

		filterFunction = x => {
			return checkForKeywords(x) && checkForPack(x)
		}

	}
	
	let res = await searchAmazonToners(toner,filterFunction)

	resp.send('ok')
});

app.get('/crawl_amazon_toners', async (req, resp) => {
	let toners = await Database.makeQuery2("SELECT * FROM toner_details_final ORDER BY Matnr")

	for(let toner of toners){
		let res = await axios.get('http://localhost:3030/crawl_amazon_toner?matnr=' + toner['Matnr'])
		console.log(res)
	}
})

app.post('/crawl_ebay_toner', async (req, resp) => {
	let { matnr } = req.body;

	console.log(matnr)
	let toner = await Database.makeQuery("SELECT * FROM toner_details_final WHERE Matnr = ?", [matnr])

	toner = toner[0]
	toner = toner.length > 0 ? toner[0] : false

	if(!toner){
		console.log('not found')
		resp.send('false')
		return
	}

	let filterFunction = f => f;

	let checkForKeywords = x => {
		return x.includes('toner') || x.includes('cartridge')
	}

	filterFunction = checkForKeywords
	let pack = toner['Pack']

	if(pack){
		let checkForPack = x => {
			let _pack = tsfc(pack).replaceAll(/pack/g, "pk")

			let text = tsfc(x)
			let includesPack = text.includes(tsfc(pack)) || text.includes(_pack) || text.includes('packof2')

			return includesPack
		}

		filterFunction = x => {
			return checkForKeywords(x) && checkForPack(x)
		}

	}
	
	let res = await searchEbayToners(toner,filterFunction)

	resp.send('ok')
});

app.get('/load_balancer', async (req, res) => {
	const sqo = new ServersQueue()

	let multiplier = 1;
	for await( let items of generateRows() ){
		console.log(items.length)

		if(multiplier < 111){
			multiplier++
			continue;
		}
		for(let i = 0; i < 100; i++){
			console.log(i)
			console.log(100 * multiplier)
			let matnr = items[i].Matnr
		
			let server;
			let port;
			let accessPort;
			
			while(true){
				await timer(1000)
				server = await sqo.getFreeServer();
				if(!server){
					await timer(500)
					continue;
				}
				
				port = server.port
				accessPort = port + 1000;
				
				if(server && port && accessPort) break;
			}

			console.log(server)
		
			let url = "https://personal-server.xyz:" + accessPort
	
			try{
				console.log('Step 1 ---- Crawling Ebay for price initiated')
				axios.post( url + '/crawl_ebay_printer', {matnr} )
				//await timer(300)
				//console.log('Step 2 ---- Crawling Amazon for price initiated')
				//await axios.post( url + '/crawl_amazon_printer', {matnr} )
				//console.log('Step 4 ---- Setting the price based on feed initiated')
				//await axios.post( url + '/crawl_for_printer', {matnr} )
			}catch(e){	
				console.log(e)
			}
		}
		multiplier++
	}
});

app.get("/test-route", async (req,resp) => {
	//let items = await Database.makeQuery2("SELECT * FROM products WHERE Class LIKE '%Network%' LIMIT 1");
	
	//console.log(items)
	//console.log(items.length)
	await axios.post('http://localhost:3030/crawl_ebay_printer', {matnr: 12986585})
	resp.send('ok')
})

async function* generateRows(){
	let count = await Database.makeQuery2("SELECT COUNT(*) as C FROM products WHERE class LIKE '%Network%'");
	let rows = count[0]['C']
	for(let i = 0; i < Math.ceil(rows / 100) * 100; i+= 100){
		yield Database.makeQuery2("SELECT * FROM products WHERE Class LIKE '%Network%' ORDER BY Matnr LIMIT 100 OFFSET " + i)
	}

	return true
}

app.listen(port, () => console.log('App running on 3030'))
