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
const { searchGoogle, findTheBestPrice } = require('./google/googleScrapper');
const fs = require('fs');
require('dotenv').config()

const timer = ms => new Promise(res => setTimeout(res, ms))

function randomIntFromInterval(min, max) { // min and max included 
  return Math.floor(Math.random() * (max - min + 1) + min)
}

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

/*				Database.getInstance().query("UPDATE accessories SET price = ? WHERE Matnr = ?", [totalPriceNew[0], arr[i].Matnr], (err, result) => {
					if(err) console.log(err)

					console.log(result)
				})*/

			let content = `Set price of ${arr[i].name} to ${totalPriceNew[0]} - ${__url} \n`;
			fs.writeFile('./writeToTxt.txt', content, { flag: 'a+' }, err => {})

			})
		})
	}

	res.send('ok')
})

function changePrice(price){
	if(price >= 1000){
		return price - randomIntFromInterval(69, 79);
	}else if(price < 1000 && price >= 750){
		return price - randomIntFromInterval(51,59);
	}else if(price < 750 && price >= 500){
		return price - randomIntFromInterval(41,49);
	}else if(price < 500 && price >= 300){
		return price - randomIntFromInterval(21,29);
	}else if(price < 300 && price >= 50){
		return price - randomIntFromInterval(12,14);
	}else if(price < 50){
		return price - randomIntFromInterval(8, 10);
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

	//arr = arr.filter(x => x.name === 'HP - DDR3 - module - 1 GB - DIMM 90-pin - unbuffered');

	//arr = arr.filter(x => x.ShortName === 'STI MICR ST9830D - printer - B/W - laser');

	for(let i = 0; i < arr.length; i++){

		await timer(5000);

		await searchGoogle(arr[i].ShortName.split(" - ")[0], arr[i].mpn).then(async (url) => {
			await findTheBestPrice(url).then( res => {
				let regex = /((?=\$)((?!=\"|\{|\}|\<|\]|delivery|[oO][fF][fF]|more).)+?(?=\<))|(Report a listing)/g;

				let matches = res.data.match(regex);

				let totalPriceNew = [];

				if(!matches) {
					let content = `Nothing was found for ${arr[i].ShortName}.\n`;
					fs.writeFile('./writeToTxt.txt', content, { flag: 'a+' }, err => {})
					return;
				}
				
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

				if(totalPriceNew[0] < 750) return;

				let newPrice = changePrice(totalPriceNew[0]);
				newPrice = Math.round(parseFloat(newPrice * 100)) / 100
				Database.getInstance().query("UPDATE products SET price = ? WHERE Matnr = ?", [newPrice, arr[i].Matnr], (err, result) => {
					if(err) console.log(err)
				})

			let content = `Set price of ${arr[i].ShortName} to (${totalPriceNew[0]} - ${newPrice}) - ${url} \n
List of prices ${JSON.stringify(totalPriceNew)}\n`;
			fs.writeFile('./writeToTxt.txt', content, { flag: 'a+' }, err => {})

			})
		})
	}

	res.send('ok')
})

app.listen(port, () => console.log('App running on 3030'))