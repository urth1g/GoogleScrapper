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
const { searchAmazon, findTheBestPriceAmazon } = require('./amazon/amazonScrapper');
const { searchEbay, findTheBestPriceEbay } = require('./ebay/ebayScrapper');
const { searchTechdata } = require('./techdata/techdataScrapper');
const { getData } = require('./google/spreadsheets');
const { pricesFromTxt } = require('./pricesFromTxt/pricesFromTxt');
const getInventory = require('./helpers/getInventory');
const fs = require('fs');
const cors = require('cors');

require('dotenv').config()

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

app.get('/crawl_accessories', async (req, res) => {


	let accessories = await getAccessories()

	accessories = accessories.filter(x => x.name !== '')

	let obj = {};

	let arr = [];

	accessories.forEach(x => {
		if(obj[x.Matnr]){ 
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

				console.log(url.price)
			
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
		console.log(obj20004000.sort((a,b) => a - b)[Math.floor(obj20004000.length / 2)])
		console.log(obj4000.sort((a,b) => a - b)[Math.floor(obj4000.length / 2)])*/
		console.log(obj)
		res.send('ok')
	})
});


app.get('/crawl_amazon_printers', async (req, res) => {
	let printers = await getPrinters();

	printers = printers.filter(x => !x.ShortName.includes('STI'));

	printers = printers.slice(565);

	for(let i = 0;i < printers.length; i++){
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

	let printers = await getPrinters();

	let printer = printers.filter(x => x.Matnr === matnr)[0]

	let name = printer.ShortName;
	let mpn = printer.mpn;

	let prices = await searchAmazon(name.split(" - ")[0], mpn, matnr)

	res.send(prices);
})

app.post("/crawl_for_printer", async (req, resp) => {
	let printers = await getPrinters();

	let matnr = req.body.matnr;

	let printer = printers.filter(x => x.Matnr === matnr);

	if(printer.length === 0) return;

	let Matnr = printer[0].Matnr;
	let Name = printer[0].ShortName;

	let _Name = Name.split(" - ")[0];
	let splitted = _Name.split(" ");

	let brand = splitted[0];
	let model = splitted[splitted.length - 1];

	Name = `${brand} ${model}`

	try{
		await searchGoogle(Name, printer[0].mpn).then(async (url, skipPage4) => {

			if(url === 'Nothing found.') {
				resp.send([])
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
						newPrice = Math.round(parseFloat( ((sources[0] + 50) + ((sources[0]+50) * 0.045)) * 100)) / 100;
					}

					Database.getInstance().query("UPDATE products SET price = ? WHERE Matnr = ?", [newPrice, Matnr], (err, result) => {
						if(err) console.log(err)

						console.log(result)
					})
				})();
			}else if(skipPage4 && !url){
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
						let content = `Nothing was found for ${Name}.\n`;
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



					try{
						await Database.getInstance().promise().query("INSERT INTO inventory_log VALUES(?,?,?,?)", [Matnr, Name, JSON.stringify(totalPriceNew), url])
					}catch(err){
						if(err.errno === 1062){
							await Database.getInstance().promise().query("UPDATE inventory_log SET Inventory = ?, Link = ? WHERE Matnr = ?", [
								JSON.stringify(totalPriceNew),
								url,
								Matnr
							])
						}
					}

					let amoFaxExists = totalPriceNew.filter(x => x.shop === 'A Matter of Fax').length === 1;

					totalPriceNew = totalPriceNew.filter(x => x.shop !== 'Amofax');

					let shopToBeat = null;
					let average = 0;
					let modifier = 55;

					if(amoFaxExists){
						let index = totalPriceNew.findIndex(x => x.shop === 'A Matter of Fax');

						shopToBeat = totalPriceNew[index + 2];

						if(!shopToBeat) shopToBeat = totalPriceNew[index + 1]

						if(index === totalPriceNew.length - 1) {
							shopToBeat = totalPriceNew[index]
							shopToBeat.price = shopToBeat.price + 90;
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
							modifier = medians[1]
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


						let inventory = await Database.getInstance().promise().query("SELECT * FROM inventory WHERE Matnr = ?", [Matnr]);

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
						if(Techdata) sources.push(...Techdata.map(x => x.price));

						sources.sort((a,b) => a - b);

						if(sources.length !== 0){
							newPrice = Math.round(parseFloat( ((sources[0] + 50) + ((sources[0]+50) * 0.045)) * 100)) / 100;
						}
					}

					if(Number.isNaN(newPrice)) return;


					Database.getInstance().query("UPDATE products SET price = ? WHERE Matnr = ?", [newPrice, Matnr], (err, result) => {
						if(err) console.log(err)

						console.log(result)
					})

					console.log(Name, newPrice)
					let content = `Set price of ${Name} to (${newPrice}) - ${url}\n
List of prices ${JSON.stringify(totalPriceNew)}\n\n
Amazon: ${JSON.stringify(Amazon)}\n
Ebay: ${JSON.stringify(Ebay)}\n
Techdata: ${JSON.stringify(Techdata)}\n\n
`;
					fs.writeFile('./writeToTxt.txt', content, { flag: 'a+' }, err => {})
						resp.send({ok: true})
					})

			}catch(e){
				console.log(e)
			}
		})
	}catch(e){

	}

})

app.get('/crawl_ebay_printers', (req, res) => {

	(async () => {
		let printers = await getPrinters();

		printers = printers.filter(x => !x.ShortName.includes('STI'));

		for(let i = 0; i < printers.length; i++){
			let int = randomIntFromInterval(7000,8000);
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

	let printers = await getPrinters();

	let printer = printers.filter(x => x.Matnr === matnr)[0]

	let name = printer.ShortName;
	let mpn = printer.mpn;

	let prices = await searchEbay(name.split(" - ")[0], mpn, matnr);

	res.send(prices)
})

app.get('/crawl_ebay_links', async (req, res) => {

})

app.get('/crawl_techdata_printers', (req, res) => {
	let urls = searchTechdata()
	res.send('ok');
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

app.listen(port, () => console.log('App running on 3030'))