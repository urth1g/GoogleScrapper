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
const { getData } = require('./google/spreadsheets');
const { pricesFromTxt } = require('./pricesFromTxt/pricesFromTxt');
const fs = require('fs');
const cors = require('cors');

require('dotenv').config()

const timer = ms => new Promise(res => setTimeout(res, ms))

function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}

app.use(cors({
	origin: 'http://localhost:3000'
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
		return +(price - randomIntFromInterval(4,8)).toFixed(2);
	}else if(price < 300 && price >= 50){
		return +(price - randomIntFromInterval(5,10)).toFixed(2);
	}else if(price < 50){
		return +(price - randomIntFromInterval(0, 1)).toFixed(2);
	}
}
app.get('/crawl_printers', async (req, res) => {


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

	//arr = arr.filter(x => x.ShortName === 'Canon imageCLASS LBP351dn - printer - B/W - laser');

	arr = arr.filter(x => !x.ShortName.includes('STI'));

	console.log(arr.length);

	for(let i = 0; i < arr.length; i++){

		let Matnr = arr[i].Matnr;
		let Name = arr[i].ShortName;
		await timer(7000);

		try{
			await searchGoogle(arr[i].ShortName.split(" - ")[0], arr[i].mpn).then(async (url) => {
				try{
					await findTheBestPrice(url).then( res => {
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

						let shopToBeat = null;
						let average = 0;
						let modifier = 55;

						if(amoFaxExists){
							let index = totalPriceNew.findIndex(x => x.shop === 'A Matter of Fax');

							console.log(index)
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
								modifiers = medians[1]
							}else if(average > 350 && average <= 500){
								modifier = medians[0]
							}
						}

						let newPrice = 0;

						if(shopToBeat){
							newPrice = changePrice(shopToBeat.price);
							newPrice = Math.round(parseFloat(newPrice * 100)) / 100
						}else{
							newPrice = changePrice(average + modifier);
							newPrice = Math.round(parseFloat(newPrice * 100)) / 100
						}

						if(Number.isNaN(newPrice)) return;

						Database.getInstance().query("UPDATE products SET price = ? WHERE Matnr = ?", [newPrice, arr[i].Matnr], (err, result) => {
							if(err) console.log(err)

							console.log(result)
						})

					let content = `Set price of ${arr[i].ShortName} to (${newPrice}) - ${url}
		List of prices ${JSON.stringify(totalPriceNew)}\n`;
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

	res.send('ok')
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

	for(let i = 0;i < printers.length; i++){
		let int = randomIntFromInterval(6000,8000);
		console.log(int)
		await timer(int);

		let name = printers[i].ShortName;
		let mpn = printers[i].mpn;
		let matnr = printers[i].Matnr;
		await searchAmazon(name.split(" - ")[0], mpn, matnr);
	}
})
app.post("/crawl_for_printer", async (req, res) => {
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
		await searchGoogle(Name, printer[0].mpn).then(async (url, grading) => {
			try{
				await findTheBestPrice(url).then( res => {
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

					let amoFaxExists = totalPriceNew.filter(x => x.shop === 'A Matter of Fax').length === 1;

					totalPriceNew = totalPriceNew.filter(x => x.shop !== 'Amofax');

					let shopToBeat = null;
					let average = 0;
					let modifier = 55;

					if(amoFaxExists){
						let index = totalPriceNew.findIndex(x => x.shop === 'A Matter of Fax');

						console.log(index)
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

					if(shopToBeat){
						newPrice = changePrice(shopToBeat.price);
						newPrice = Math.round(parseFloat(newPrice * 100)) / 100
					}else{
						newPrice = changePrice(average + modifier);
						newPrice = Math.round(parseFloat(newPrice * 100)) / 100
					}

					if(Number.isNaN(newPrice)) return;

					Database.getInstance().query("UPDATE products SET price = ? WHERE Matnr = ?", [newPrice, Matnr], (err, result) => {
						if(err) console.log(err)

						console.log(result)
					})

					console.log(Name, newPrice)
					let content = `Set price of ${Name} to (${newPrice}) - ${url}
		List of prices ${JSON.stringify(totalPriceNew)}\n`;
					fs.writeFile('./writeToTxt.txt', content, { flag: 'a+' }, err => {})

					});

			}catch(e){
				console.log(e)
			}
		})
	}catch(e){
		console.log(e)
	}

})

app.get('/crawl_ebay_printers', async (req, res) => {
	let printers = await getPrinters();

	printers = printers.filter(x => !x.ShortName.includes('STI'));

	printers = printers.slice(271);
	for(let i = 0;i < printers.length; i++){
		let int = randomIntFromInterval(3000,5000);
		console.log(int)
		console.log(i)
		await timer(int);

		let name = printers[i].ShortName;
		let mpn = printers[i].mpn;
		let matnr = printers[i].Matnr;
		try{
			await searchEbay(name.split(" - ")[0], mpn, matnr);
		}catch(e){
			console.log(e)
		}
	}
})
app.listen(port, () => console.log('App running on 3030'))