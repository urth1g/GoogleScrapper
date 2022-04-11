const Database = require('../db/db');
const cheerio = require('cheerio');
const axios = require('axios');

const timer = ms => new Promise(res => setTimeout(res, ms))

async function run(){
    let printers = await Database.makeQuery2("SELECT * FROM products WHERE SubClass LIKE '%Laser%' OR ( SubClass LIKE '%Multifunction%' AND LongName LIKE '%Laser%' ) GROUP BY products.Matnr ORDER BY products.Price");

    printers = printers.slice(310);



    for(const printer of printers){
        let name = printer.ShortName.split(" - ")[0]
        let matnr = printer.Matnr 

        console.log(name, matnr)
        let res;
        try{
            res = await axios.get(`https://www.upcitemdb.com/query?s=${name}&type=2`)
        }catch(e){
            console.log(e)
            continue;
        }

        let $ = cheerio.load(res.data);

        let $a = $("ul > li > div > a");



        let upc = $($a[0]).text()


        try{
            let res = await Database.makeQuery("UPDATE products SET gtin = ? WHERE Matnr = ?", [upc, matnr])
            console.log(res)
        }catch(e){
            console.log(e)
        }


        await timer(2800);
    }
}

run();