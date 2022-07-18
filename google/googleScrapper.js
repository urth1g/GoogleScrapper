const axios = require('axios');
const Database = require('../db/db');
const { getAccessories } = require('../database_getters/accessories');
const __subsets = require('../helpers/subsets');
const tsfc = require('../helpers/transformStringForComparison');
const fs = require('fs');


function DamerauLevenshtein(prices, damerau) {
  //'prices' customisation of the edit costs by passing an object with optional 'insert', 'remove', 'substitute', and
  //'transpose' keys, corresponding to either a constant number, or a function that returns the cost. The default cost
  //for each operation is 1. The price functions take relevant character(s) as arguments, should return numbers, and
  //have the following form:
  //
  //insert: function (inserted) { return NUMBER; }
  //
  //remove: function (removed) { return NUMBER; }
  //
  //substitute: function (from, to) { return NUMBER; }
  //
  //transpose: function (backward, forward) { return NUMBER; }
  //
  //The damerau flag allows us to turn off transposition and only do plain Levenshtein distance.

  if (damerau !== false) {
    damerau = true;
  }
  if (!prices) {
    prices = {};
  }
  let insert, remove, substitute, transpose;

  switch (typeof prices.insert) {
    case 'function':
      insert = prices.insert;
      break;
    case 'number':
      insert = function (c) {
        return prices.insert;
      };
      break;
    default:
      insert = function (c) {
        return 1;
      };
      break;
  }

  switch (typeof prices.remove) {
    case 'function':
      remove = prices.remove;
      break;
    case 'number':
      remove = function (c) {
        return prices.remove;
      };
      break;
    default:
      remove = function (c) {
        return 1;
      };
      break;
  }

  switch (typeof prices.substitute) {
    case 'function':
      substitute = prices.substitute;
      break;
    case 'number':
      substitute = function (from, to) {
        return prices.substitute;
      };
      break;
    default:
      substitute = function (from, to) {
        return 1;
      };
      break;
  }

  switch (typeof prices.transpose) {
    case 'function':
      transpose = prices.transpose;
      break;
    case 'number':
      transpose = function (backward, forward) {
        return prices.transpose;
      };
      break;
    default:
      transpose = function (backward, forward) {
        return 1;
      };
      break;
  }

  function distance(down, across) {
    //http://en.wikipedia.org/wiki/Damerau%E2%80%93Levenshtein_distance
    let ds = [];
    if (down === across) {
      return 0;
    } else {
      down = down.split('');
      down.unshift(null);
      across = across.split('');
      across.unshift(null);
      down.forEach(function (d, i) {
        if (!ds[i]) {
          ds[i] = [];
        }
        across.forEach(function (a, j) {
          if (i === 0 && j === 0) {
            ds[i][j] = 0;
          } else if (i === 0) {
            //Empty down (i == 0) -> across[1..j] by inserting
            ds[i][j] = ds[i][j - 1] + insert(a);
          } else if (j === 0) {
            //Down -> empty across (j == 0) by deleting
            ds[i][j] = ds[i - 1][j] + remove(d);
          } else {
            //Find the least costly operation that turns the prefix down[1..i] into the prefix across[1..j] using
            //already calculated costs for getting to shorter matches.
            ds[i][j] = Math.min(
              //Cost of editing down[1..i-1] to across[1..j] plus cost of deleting
              //down[i] to get to down[1..i-1].
              ds[i - 1][j] + remove(d),
              //Cost of editing down[1..i] to across[1..j-1] plus cost of inserting across[j] to get to across[1..j].
              ds[i][j - 1] + insert(a),
              //Cost of editing down[1..i-1] to across[1..j-1] plus cost of substituting down[i] (d) with across[j]
              //(a) to get to across[1..j].
              ds[i - 1][j - 1] + (d === a ? 0 : substitute(d, a))
            );
            //Can we match the last two letters of down with across by transposing them? Cost of getting from
            //down[i-2] to across[j-2] plus cost of moving down[i-1] forward and down[i] backward to match
            //across[j-1..j].
            if (damerau && i > 1 && j > 1 && down[i - 1] === a && d === across[j - 1]) {
              ds[i][j] = Math.min(ds[i][j], ds[i - 2][j - 2] + (d === a ? 0 : transpose(d, down[i - 1])));
            }
          }
        });
      });
      return ds[down.length - 1][across.length - 1];
    }
  }
  return distance;
}


/*function generateSubsets(arr){

let _arr = [];

for(let i = 0; i < arr.length; i++){
  let strr = arr.slice(i, arr.length).join("")
  let strr2 = arr.slice(0, arr.length - i).join("")

  _arr.push(strr)
  _arr.push(strr2)
}

return _arr;

}*/


function interateThroughSubsets(object, term, productName, model){

	return new Promise ((resolve, reject) =>{
		let grading = [];

    if(object.length === 0) resolve([])

		object.forEach(async (x,i) => {
			let subsets = await __subsets.v2(x.name);

			let distance = Number.MAX_SAFE_INTEGER;

			subsets.forEach(x => {
        if(x.includes("#")) x = x.split("#")[0]
        
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

let d1 = DamerauLevenshtein();


function filterResults(object){

      return object.filter(x => {
        let text = x.name;
        
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
        !text.toLowerCase().includes('manual') &&
        !text.toLowerCase().includes('refurbished') && 
        !text.toLowerCase().includes('charger') && 
        !text.toLowerCase().includes('cover') && 
        !text.toLowerCase().includes('ram') &&
        !text.toLowerCase().includes('unit') &&
        !text.toLowerCase().includes('cassette') && 
        !/\bcd\b/g.test(text.toLowerCase()) &&
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
        !text.toLowerCase().includes('compatible') &&
        !text.toLowerCase().includes('cabinet') &&
        !(text.toLowerCase().includes('ink') && !text.toLowerCase().includes('jet')) &&
        !text.toLowerCase().includes('cartouche') && 
        !text.toLowerCase().includes('printhead') &&
        !text.toLowerCase().includes('motor') &&
        !(text.toLowerCase().includes('lexmark') && text.toLowerCase().includes('76c')) &&
        !(text.toLowerCase().includes('lexmark') && text.toLowerCase().includes('58d')) &&
        !(text.toLowerCase().includes('lexmark') && text.toLowerCase().includes('41x')) &&
        !(text.toLowerCase().includes('lexmark') && /\b32c\b/g.test(text.toLowerCase())) &&
        !(text.toLowerCase().includes('lexmark') && text.toLowerCase().includes('57x')) &&
        !(text.toLowerCase().includes('lexmark') && text.toLowerCase().includes('78c')) &&
        !(text.toLowerCase().includes('lexmark') && text.toLowerCase().includes('return')) &&
        !(text.toLowerCase().includes('lexmark') && text.toLowerCase().includes('25b')) &&
        !text.toLowerCase().includes('assembly') &&
        !text.toLowerCase().includes('role') &&
        !/\bfor\b/g.test(text.toLowerCase()) &&
        !text.toLowerCase().includes('finisher') &&
        !text.toLowerCase().includes('drawers') &&
        !text.toLowerCase().includes('belt') &&
        !text.toLowerCase().includes('215a') &&
        !text.toLowerCase().includes('cyan') &&
        !text.toLowerCase().includes('setup') &&
        !text.toLowerCase().includes('board') &&
        !text.toLowerCase().includes('genuine') &&
        !text.toLowerCase().includes('scanner glass') && 
        !text.toLowerCase().includes('sensor') && 
        !text.toLowerCase().includes('guide') && 
        !text.toLowerCase().includes('hinge')
      })
}

async function generateGoogleConditions(productName, partNumber){
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


  if(term.includes("#")) term = term.split("#")[0]
  if(model.includes("#")) model = model.split("#")[0]
  
  if(term === 'D7P71A') term = 'HEWD7P71A';

  return [ term, model ]
}
async function searchGoogle(term, productName, partNumber, model){

	let hl = "en";
	let gl = "us";
	let tbm = "shop";

	return new Promise( async (resolve, reject) => {

		axios.get(`https://shopping.google.com/search?q=${term}&hl=${hl}&gl=${gl}&tbm=${tbm}`).then( async res => {
			let regex = /((?<=href=\")((?!=\<|\{|\,|http[s]?).)*?\boffers\b.+?(?="))/g
			let regex2 = /data\-what\=\"1\".+?\h3.+?\>(.+?(?=\<))/g
			//let regex3 = /title\=\"((?:(?!title|td).)*?)(\/shopping\/product.*?(?=\/offers).+?)(?=\")/g
      let regex3 = /title\=\"((?:(?!\btitle\b|\btd\b).)*?)<a href="(\/shopping\/product.*?(?=\/offers).+?)(?=\")/g
      let regex4 = /^(.+?)(?=\")/g;
      let regex5 = /Best\smatch.+?\/offers.+?\"/g
      let regex6 = /((?:(?!\").)*?\/offers.+?(?=\"))/g
      let regex7 = /server\"\>.+?\>(?:(?!img))(.*?)\</g
      let regex8 = /title\=\"((?:(?!title).)*?)".+?\$(.+?)<.+?<div.+?>.+?\>(.+?)</g

			let matches = regex3.exec(res.data);

			let object = []

      let string = res.data.match(regex5);

      if(string){
        string = string[0]
        let url = string.match(regex6)[0]
        let _name = regex7.exec(string);

        do {
          if(!_name) break;

          let name = _name[1];

          if(name === '') continue;

          object.push({name, url})
        } while((_name = regex7.exec(string)) !== null);
      }

			//fs.writeFile('./debugHTML.txt', res.data, { flag: 'a+' }, err => {})

      let _matches;
      let skipPage4;
			if(!matches && object.length === 0) {
        _matches = regex8.exec(res.data);
        skipPage4 = true;
        do {
          if(!_matches) break;
          let name = _matches[1];
          let price = _matches[2];
          let shop = _matches[3];
          object.push({name, price, shop})
        } while((_matches = regex8.exec(res.data)) !== null);

      console.log('stop2')
    }else{
        do {
          if(!matches) break;

          let name = matches[1];
          let url = matches[2];

          object.push({name, url})
        } while((matches = regex3.exec(res.data)) !== null);

      }

      console.log('stop3')

      object = object.map(x => {
        let name = x.name.match(regex4)
        if(name) name = name[0]

        if(!name){
          return { name: x.name, url: x.url }
        }else{
          let obj = { name: name, url: x.url }
          return obj;
        }
      })

      console.log('stop4')

			object = filterResults(object)

      console.log('stop5')
			let grading = await interateThroughSubsets(object, term, productName, model);

      console.log(term)
      console.log('stop6')
			grading.sort((a,b) => a.distance - b.distance);


			if(grading.length === 0) {
        object = [];
        skipPage4 = true;
        _matches = regex8.exec(res.data);
        skipPage4 = true;

        do {
          if(!_matches) break;
          let name =  _matches[1];
          let price = _matches[2];
          let shop = _matches[3];
          object.push({name, price, shop})
        } while((_matches = regex8.exec(res.data)) !== null);
        object = filterResults(object)
        grading = await interateThroughSubsets(object, term, productName, model);

        grading.sort((a,b) => a.distance - b.distance);
      }

      if(grading.length === 0) resolve('Nothing found.')

      if(skipPage4){
        resolve(grading[0], skipPage4)
      }else{
        resolve(grading[0].url)
      }
			
		}).catch( err => {
      console.log(err)
			reject(err)
		})
	})
}

async function findTheBestPrice(link){

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

// function insertCompetitors(){
// let shopsToFilter = [];

// for(let i = 0; i < totalPriceNew.length; i++){
// let current = totalPriceNew[i];

// if(current.shop === 'A Matter of Fax') break;

// shopsToFilter.push(current.shop);
// }

// let arr = [Matnr, Name, JSON.stringify(shopsToFilter), JSON.stringify(totalPriceNew), shopsToFilter.length];
// Database.getInstance().query("INSERT INTO products_filter_list (Matnr, Name, ShopsToFilter, Shops, ShopsToFilterNumber) VALUES (?)", [arr], (err, result) => {
// if(err) console.log(err)

// console.log(result)
// })
// }

function findAverage(prices){
  let avg = 0;

  prices.forEach(x => avg += x.price);

  let num = avg / prices.length;

  return +num.toFixed(2)
}

module.exports = { searchGoogle, findTheBestPrice, findAverage, generateGoogleConditions };