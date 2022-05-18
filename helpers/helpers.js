const __subsets = require('./subsets');
const d1 = require('./search')
const tsfc = require('./transformStringForComparison')

class Helpers{
    constructor(){

    }

    async gradeResults(object, term, toMatch){
        return new Promise ( async (resolve, reject) =>{
            let grading = [];
    
            object.forEach(async (x,i) => {
                let subsets = await __subsets.v2(x.name);
    
                let distance = Number.MAX_SAFE_INTEGER;
    
                subsets.forEach(x => {
                    x = x.toLowerCase().replace(/(2pk|3pk)/g, "")
                    toMatch = toMatch.toLowerCase().replace(/(2pk|3pk)/g, "")
                    let _distance = d1(tsfc(x), tsfc(toMatch));

                    if(_distance < distance) distance = _distance;
                })
    
            if(distance === 0) grading.push({name: x.name, url: x.url, distance, term, price: tsfc(x.price), shop: x.shop})
    
                if(i === object.length - 1){
                    resolve(grading)
                }
            })
        })
    }

    searchForBestOffer(string, object){
        if(!string) return;

        let regex6 = /((?:(?!\").)*?\/offers.+?(?=\"))/g
        let regex7 = /server\"\>.+?\>(?:(?!img))(.*?)\</g

        string = string[0]
        let url = string.match(regex6)[0]
        let _name = regex7.exec(string);

        do {
            if(!_name) return;

            let name = _name[1];

            if(name === '') continue;

            object.push({name, url})
        } while((_name = regex7.exec(string)) !== null);
    }

    searchPageOne(regexInput, object){
		let regex8 = /title\=\"((?:(?!title).)*?)".+?\$(.+?)<.+?<div.+?>.+?\>(.+?)</g

        let _matches = regex8.exec(regexInput);

        if(!_matches) return false;

        do {
          let name = _matches[1];
          let price = _matches[2];
          let shop = _matches[3];
          object.push({name, price, shop})
        } while((_matches = regex8.exec(regexInput)) !== null);
    }

    continueWithoutBestOffer(regexInput, object, matches){
		let regex3 = /title\=\"((?:(?!title|td).)*?)<a href="(\/shopping\/product.*?(?=\/offers).+?)(?=\")/g

        do {
            let name = matches[1];
            let url = matches[2];
  
            object.push({name, url})
        } while((matches = regex3.exec(regexInput)) !== null);
    }

    extractCompanyNames(object){
        let regex4 = /^(.+?)(?=\")/g;

        return object.map(x => {
            let name = x.name.match(regex4)
            if(name) name = name[0]

            if(!name){
              return { ...x, name: x.name, url: x.url }
            }else{
              let obj = { ...x, name: name, url: x.url }
              return obj;
            }
        })
    }
}

module.exports = Helpers;