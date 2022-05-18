const Database = require('../db/db');
const axios = require('axios');
const cheerio = require('cheerio');
const tsfc  = require('../helpers/transformStringForComparison');

const timer = ms => new Promise(res => setTimeout(res, ms))

async function run(){
    let res = await Database.makeQuery2("SELECT * FROM toner_details_final");

    let dict = {} 

    for(let i = 4; i < res.length; i++){
        let matnr = res[i].Matnr 
        let name = res[i]['Name'].split(" - ")[0]
        let pack = res[i]['Pack'];
        let modelDB = res[i]['Model'];
        let colorDB = res[i]['Color']

        if(dict[matnr]) continue
        else dict[matnr] = true

        try{
            let resp = await axios.get("https://www.cdw.com/search/?key="+name)

            console.log("https://www.cdw.com/search/?key="+name)
    
            let match = resp.data.matchAll(/location\.href = \"(.+?)\"/g);
    
            match = [ ...match ]

            let urlToVisit = null
            let productPage = false;

            if(match.length !== 0){
                urlToVisit = match[0][1]
                productPage = urlToVisit.includes("/product") ? true : false;
                resp = await axios.get('https://www.cdw.com' + urlToVisit);
            }
            
            const $ = cheerio.load(resp.data)

            let searchResults = $(".search-result");

            if(!productPage){
                let scrapArray = [];

                searchResults.each(async function(){
                    let mpn = $(this).find(".product-codes > .mfg-code").text().trim().split(":")[1].trim();
                    let headers = $(this).find(".product-spec-header");
                    let values = $(this).find(".product-spec-value");
                    let name = $(this).find("h2 > a").text().trim().toLocaleLowerCase();
    
                    let _colors = []
    
                    if(name.includes("black")) _colors.push("black")
                    if(name.includes("yellow")) _colors.push("yellow")
                    if(name.includes("magenta")) _colors.push("magenta");
                    if(name.includes("cyan")) _colors.push("cyan")
    
                    if(pack){
                        if(!name.includes(pack)) return true
                    }

                    if(_colors.join(",") === colorDB && tsfc(name).includes(tsfc(modelDB)) ){
                        console.log('match')
                        console.log(mpn)
                        let rsdb = await Database.makeQuery2("UPDATE products SET mpn = ? WHERE Matnr = ?", [mpn, matnr])
                        console.log(rsdb)
                    }
                })
    
            }else{
                let mpn = $(".mpn").text().trim();
                let name = $("#primaryProductNameStickyHeader").text().trim().toLocaleLowerCase()

                console.log(name)
                console.log(modelDB.toLocaleLowerCase())
                let _colors = []
    
                if(name.includes("black")) _colors.push("black")
                if(name.includes("yellow")) _colors.push("yellow")
                if(name.includes("magenta")) _colors.push("magenta")
                if(name.includes("cyan")) _colors.push("cyan")

                if(_colors.join(",") === colorDB && tsfc(name).includes(tsfc(modelDB)) ){
                    console.log('match')
                    console.log(mpn)
                    console.log('product page')
                    let rsdb = await Database.makeQuery2("UPDATE products SET mpn = ? WHERE Matnr = ?", [mpn, matnr])

                    console.log(rsdb)
                }
            }

            await timer(10000)
        }catch(e){
            console.log(e)
            continue;
        }

    }

}

run()