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
    let res = await Database.makeQuery2("SELECT inventory_log.Matnr, products.ShortName, JSON_ARRAYAGG(images.url) as imgs FROM inventory_log LEFT JOIN products ON inventory_log.Matnr = products.Matnr LEFT JOIN images ON inventory_log.Matnr = images.Matnr WHERE Link != 'Nothing found.' GROUP BY inventory_log.Matnr, products.ShortName ORDER BY RAND()")


    console.log(res.length)
    
    res = res.filter(x => !x.imgs[0])

    console.log(res.length)

    let dict = {}

    let i = 0;
    for(let r of res){
        let Matnr = r.Matnr;
        let Name = r.ShortName;

        i++

        console.log(i)

        if(!dict[Matnr]) dict[Matnr] = true;
        else continue;

        let ress = await Database.makeQuery2("SELECT * FROM images WHERE Matnr = ?", [Matnr])

        if(ress.length !== 0) {``
          console.log(ress)
          continue;
        }

        try{
            const results = await google.scrape(Name, 10);

            let respInsert = await Database.makeQuery2("INSERT INTO images (Matnr, url) VALUES (?,?)", [Matnr, results[0].url]);
            console.log(respInsert)
        }catch(e){
            console.log(e)
            continue;
        }
    }

    return
}

run();