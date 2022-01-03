const axios = require('axios');
const Database = require('../db/db');
const { getAccessories } = require('../database_getters/accessories');

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

function generateSubsets(arr){

  return new Promise((resolve, reject) => {
	  let _arr = [];

	  for(let i = 0; i < arr.length; i++){
	    for(let j = i+1; j < arr.length + 1; j++){
	      let str = arr.slice(i,j).join("")
	      _arr.push(str)
	    }
	  }

	  resolve(_arr)
  })
}


function interateThroughSubsets(object, term, productName){
	return new Promise ((resolve, reject) =>{
		let grading = [];

		object.forEach(async (x,i) => {
			let name = x.name.toLowerCase().replace(/\,|\s|\-/g, "")
			let _term = term.toLowerCase().replace(/\,|\s|\-/g, "")

			let subsets = await generateSubsets(name.split(""));

			let distance = Number.MAX_SAFE_INTEGER;

			subsets.forEach(x => {
				let _distance = d1(x, productName.toLowerCase().replace(/\,|\s|\-/g, ""));
				let __distance;

				if(productName.includes("STI")){
					let _productName = productName.toLowerCase().replace(/sti/ig, 'Source Technologies').replace(/\,|\s|\-/g, "");
					__distance = d1(x, _productName);

					_distance = Math.min(__distance, _distance);
				}

				if(_distance < distance) distance = _distance;
			})

			grading.push({name: x.name, url: x.url, distance, term})

			if(i === object.length - 1){
				resolve(grading)
			}
		})
	})
}
let d1 = DamerauLevenshtein();

async function searchGoogle(productName, partNumber){

	let hl = "en";
	let gl = "us";
	let tbm = "shop";
	let term = productName;

	return new Promise( async (resolve, reject) => {
		axios.get(`https://shopping.google.com/search?q=${term}&hl=${hl}&gl=${gl}&tbm=${tbm}`).then( async res => {
			let regex = /((?<=href=\")((?!=\<|\{|\,|http[s]?).)*?\boffers\b.+?(?="))/g
			let regex2 = /data\-what\=\"1\".+?\h3.+?\>(.+?(?=\<))/g
			let regex3 = /(?<=title\=\")(.+?)(?=\").+?(\/shopping\/product.+?)(?=\")/mg

			let matches = regex3.exec(res.data);

			let object = []
			do {
			  let name = matches[1];
			  let url = matches[2];

			  object.push({name, url})

			} while((matches = regex3.exec(res.data)) !== null);


			object = object.filter(x => {
				return !x.name.toLowerCase().includes('drum') && 
				!x.name.toLowerCase().includes('toner') && 
				!x.name.toLowerCase().includes('cartridge') && 
				!x.name.toLowerCase().includes('bundle') && 
				!x.name.toLowerCase().includes('pack') &&
				!x.name.toLowerCase().includes('yield') &&
				!x.name.toLowerCase().includes("high")
			})

			let grading = await interateThroughSubsets(object, term, productName);

			grading.sort((a,b) => a.distance - b.distance);

			console.log(grading)
			if(grading.length === 0) reject('Nothing found.')

			await resolve(grading[0].url)
			
		}).catch( err => {
			reject(err)
		})
	})
}

async function findTheBestPrice(link){

	let baseURL = 'https://shopping.google.com'
	return new Promise( async (resolve, reject) => {
		axios.get(baseURL + link + '&tbs=new:1').then( async res => {
			await resolve(res)
		}).catch(err => {
			reject(err)
		})
	})
}

module.exports = { searchGoogle, findTheBestPrice };