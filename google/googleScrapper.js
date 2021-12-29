const axios = require('axios');
const Database = require('../db/db');
const { getAccessories } = require('../database_getters/accessories');

function searchGoogle(term){

	let hl = "en";
	let gl = "us";
	let tbm = "shop";

	return new Promise((resolve, reject) => {
		axios.get(`https://shopping.google.com/search?q=${term}&hl=${hl}&gl=${gl}&tbm=${tbm}`).then( res => {
			let regex = /((?<=href=\")((?!=\<|\{|\,|http[s]?).)*?\boffers\b.+?(?="))/g;

			let matches = res.data.match(regex);

			resolve(matches)
			
		}).catch( err => {
			reject(err)
		})
	})
}

function findTheBestPrice(link){

	let baseURL = 'https://shopping.google.com'
	return new Promise((resolve, reject) => {
		axios.get(baseURL + link + '&tbs=new:1').then( res => {
			console.log(res)
			resolve(res)
		}).catch(err => {
			reject(err)
		})
	})
}

module.exports = { searchGoogle, findTheBestPrice };