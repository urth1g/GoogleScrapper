const Database = require('../db/db');
const axios = require('axios');
const cheerio = require('cheerio');
var Scraper = require('images-scraper');

const google = new Scraper({
  puppeteer: {
    headless: false,
  },
});

const timer = ms => new Promise( resolve => setTimeout(resolve, ms))
async function run(){
    let res = await Database.makeQuery2("SELECT *, COALESCE(scanner_details_final.Matnr, images.Matnr) as Matnr FROM scanner_details_final LEFT JOIN images ON scanner_details_final.Matnr = images.Matnr LEFT join products ON products.Matnr = scanner_details_final.Matnr WHERE url is NULL GROUP BY scanner_details_final.Matnr")

    let dict = {}

    console.log(res.length)
    for(let r of res){
        let Matnr = r.Matnr;
        let Name = r.ShortName;

        if(!dict[Matnr]) dict[Matnr] = true;
        else continue;

        try{
            const results = await google.scrape(Name, 20);

            let respInsert = await Database.makeQuery2("INSERT INTO images (Matnr, url) VALUES (?,?)", [Matnr, results[0].url]);
            //console.log(respInsert)
            //console.log(results)
        }catch(e){
            console.log(e)
            continue;
        }
    }
}

run();