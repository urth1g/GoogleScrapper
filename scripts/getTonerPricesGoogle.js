const Database = require('../db/db');
const timer = ms => new Promise(res => setTimeout(res, ms))
const axios = require('axios')
const tsfc = require('../helpers/transformStringForComparison');
const { compareDocumentPosition } = require('domutils');
const Helpers = require('../helpers/helpers');
const BestPriceGoogle = require('../helpers/BestPriceGoogle');
const changePrice = require('../helpers/changePrice');
const fs = require('fs')

async function statistics(){

    let toners = null;
    let printers = null;

    try{
        toners = await Database.getInstance().promise().query("SELECT * FROM toner_details_final");
        printers = await Database.getInstance().promise().query("SELECT * FROM products WHERE SubClass LIKE '%Laser%' OR (SubClass LIKE '%Multif%' AND ShortName LIKE '%laser%')")
    }catch(e){
        console.log(e)
    }

    toners = toners.length > 0 ? toners[0] : []
    printers = printers.length > 0 ? printers[0] : []

    let i = 0;

    let dict = {}
    let printersCoveredWithToner = []

    for (const toner of toners ){
        const model = toner['Model']
        const name = toner['Name']
        const color = toner['Color']
        const pack = toner['Pack']
        const matnr = toner['PrinterNumber']

        if(!dict[matnr]){

            let printer = printers.filter(x => x.Matnr === matnr)
            
            printer = printer.length > 0 ? printer[0] : null

            if(printer){
                printersCoveredWithToner.push(matnr)
                dict[matnr] = true
            }
        }
        if(!model) {
            i++
        }

        //console.log(model, name, color, pack)
    }

    console.log('Length: ', i)
    console.log('Total length: ', toners.length)
    console.log('Percentage of toners for which google wouldn\'t be able to find printers: ', (i / toners.length) * 100)
    console.log('\n')
    console.log('-----------------')
    console.log('\n')
    console.log("Total number of printers: ", printers.length)
    console.log("Total number of printers covered with a toner: ", printersCoveredWithToner.length)
    console.log("Percentage of printers covered with toners: ", (printersCoveredWithToner.length / printers.length) * 100 )

}


async function run(){

    let toners = null;
    let printers = null;

    try{
        toners = await Database.getInstance().promise().query("SELECT * FROM toner_details_final");
        printers = await Database.getInstance().promise().query("SELECT * FROM products WHERE SubClass LIKE '%Laser%' OR (SubClass LIKE '%Multif%' AND ShortName LIKE '%laser%')")
    }catch(e){
        console.log(e)
    }

    toners = toners.length > 0 ? toners[0] : []
    printers = printers.length > 0 ? printers[0] : []

    toners = toners.filter(x => x.Model)

    //toners = toners.slice(458)
    let i = 0;
    for(const toner of toners){
        const model = toner['Model']
        const name = toner['Name']
        const color = toner['Color']
        const pack = toner['Pack']
        const matnr = toner['PrinterNumber']

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
    
        console.log('Current index: ', i)
        console.log('Toner name: ', name)

        let shopsToExclude = {}

        shopsToExclude['PC &amp; More'] = true
        shopsToExclude['A Matter of Fax'] = true 
        shopsToExclude['Amofax'] = true 

        let res = await searchGoogleToners(term, match, filterFunction, shopsToExclude, toner)
        await timer(5000)
        i++
    }
}

async function searchGoogleToners(term, mustMatch, filterFunction, shopsToExclude, toner){

	let hl = "en";
	let gl = "us";
	let tbm = "shop";


		return new Promise( async (resolve, reject) => {
			axios.get(`https://shopping.google.com/search?q=${term}&hl=${hl}&gl=${gl}&tbm=${tbm}`).then( async res => {
				let regex = /((?<=href=\")((?!=\<|\{|\,|http[s]?).)*?\boffers\b.+?(?="))/g
				let regex2 = /data\-what\=\"1\".+?\h3.+?\>(.+?(?=\<))/g
				//let regex3 = /title\=\"((?:(?!title|td).)*?)(\/shopping\/product.*?(?=\/offers).+?)(?=\")/g
				let regex3 = /title\=\"((?:(?!title|td).)*?)<a href="(\/shopping\/product.*?(?=\/offers).+?)(?=\")/g
				let regex4 = /^(.+?)(?=\")/g;
				let regex5 = /Best\smatch.+?\/offers.+?\"/g

				let matches = regex3.exec(res.data);
                let string = res.data.match(regex5);

                let object = []

                let helpers = new Helpers()
   
                helpers.searchForBestOffer(string, object)

                if(!matches && object.length === 0) {
                    helpers.searchPageOne(res.data, object)
                }else{
                    helpers.continueWithoutBestOffer(res.data, object, matches)
                }

                object = helpers.extractCompanyNames(object)
                object = object.filter(filterFunction)
                
                if(object.length === 0) resolve([])
                let gradedSearchResults = await helpers.gradeResults(object, term, mustMatch)

                console.log(gradedSearchResults)
                if(gradedSearchResults.length > 0){
                    let bestResult = gradedSearchResults[0]
                    let { url } = bestResult 
                    let bestPrice = await findTheBestPriceToners(url, term, shopsToExclude, toner)
                    resolve(bestPrice)
                }else{
                    resolve([])
                }
		})
	})
}

async function findTheBestPriceToners(link, name, shopsToExclude, toner){

	let baseURL = 'https://shopping.google.com'

	return new Promise( async (resolve, reject) => {
	    let url = baseURL + link + '&sfr=compass&ei=DWTdYeK_G7qHytMPm7yLsAU&tbs=new%3A1';
	    let arr = url.split("epd");
	    arr[0] += ",scoring:tp,epd:"
	    url = arr.join("")

        console.log(url)
		let { data } = await axios.get(url)

        let regex = /<td>Total price.+?\$(.+?)</g;
        let regex2 = /<span class="[a-zA-Z]{6}">((?:(?!img).)+?)</g;

        //fs.writeFile('./writeToTxt.txt', res.data, { flag: 'a+' }, err => {})
        let matches = data.match(regex);

        let totalPriceNew = [];
        let shops = [];

        let bestPriceGoogle = new BestPriceGoogle(data)

        if(!matches) {
            console.log('Nothing was found for ' + name)
        }


        await bestPriceGoogle.getShops()
        await bestPriceGoogle.generatePrices()

        let { catalog } = bestPriceGoogle

        console.log(catalog)
        await bestPriceGoogle.getInventory(toner['Matnr'])

        let shopToBeat = await bestPriceGoogle.getShopForOutbidding(shopsToExclude, true)
        console.log(shopToBeat)

        let newPrice = changePrice(shopToBeat.price)
        console.log("New price of toner would be: ", newPrice)

        let currentPriceOfToner = await Database.getInstance().promise().query("SELECT Cost FROM toner_details_final WHERE Matnr = ?", [ toner['Matnr'] ])
        currentPriceOfToner = currentPriceOfToner[0]

        currentPriceOfToner = currentPriceOfToner.length > 0 ? currentPriceOfToner[0].Cost : false

        console.log("Current price of a toner is: ", currentPriceOfToner);

        // if(currentPriceOfToner){
        //     if(newPrice < currentPriceOfToner){
        //         await bestPriceGoogle.updateTonerPrice(newPrice, toner, url)
        //     }
        // }else{
        //     await bestPriceGoogle.updateTonerPrice(newPrice, toner, url)
        // }

        await bestPriceGoogle.updateTonerPrice(newPrice, toner, url)
        
        resolve(shops)

	})
}

// run() 

// 14
// 15
// 16
// 17
// 22
// 23
// 33

module.exports = searchGoogleToners