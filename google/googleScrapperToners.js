const axios = require('axios');
const Database = require('../db/db');
const { getAccessories } = require('../database_getters/accessories');
const __subsets = require('../helpers/subsets');
const tsfc = require('../helpers/transformStringForComparison');
const d1 = require('../helpers/search');
const fs = require('fs');

function interateThroughSubsets(object, term, productName, model){
	return new Promise ((resolve, reject) =>{
		let grading = [];

		object.forEach(async (x,i) => {
			let subsets = await __subsets.v2(x.name);

			let distance = Number.MAX_SAFE_INTEGER;

			subsets.forEach(x => {
				let _distance = d1(tsfc(x), tsfc(model));
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

module.exports = { searchGoogleToners, findTheBestPriceToners };