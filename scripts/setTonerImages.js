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
    let res = await Database.makeQuery2("SELECT *, COALESCE(toner_details_final.Matnr, images.Matnr) as Matnr FROM toner_details_final LEFT JOIN images ON toner_details_final.Matnr = images.Matnr WHERE url IS NULL")

    let dict = {}

    console.log(res.length)
    for(let r of res){
        let Matnr = r.Matnr;
        let Name = r.Name;

        if(!dict[Matnr]) dict[Matnr] = true;
        else continue;

        try{
            const results = await google.scrape(Name, 10);

            let respInsert = await Database.makeQuery2("INSERT INTO images (Matnr, url) VALUES (?,?)", [Matnr, results[0].url]);
            console.log(respInsert)
        }catch(e){
            console.log(e)
            continue;
        }
    }
}

run();