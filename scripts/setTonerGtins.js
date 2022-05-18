const Database = require('../db/db');
const cheerio = require('cheerio');
const axios = require('axios');

const timer = ms => new Promise(res => setTimeout(res, ms))

async function run(){

    let res = await Database.makeQuery2("SELECT * FROM toner_details_final INNER JOIN products ON toner_details_final.Matnr = products.Matnr WHERE gtin = ''");

    let dict = {} 

    console.log(res)
    return;
    for(let i = 0; i < res.length; i++){
        let matnr = res[i].Matnr 
        let name = res[i]['Name'].split(" - ")[0]

        if(dict[matnr]) continue
        else dict[matnr] = true

        let resp;
        try{
            resp = await axios.get(`https://www.upcitemdb.com/query?s=${name}&type=2`)
        }catch(e){
            console.log(e)
            continue;
        }

        let $ = cheerio.load(resp.data);

        let $a = $("ul > li > div > a");



        let upc = $($a[0]).text()


        console.log(i)
        console.log(res.length)
        console.log(upc)
        try{
            let res = await Database.makeQuery("UPDATE products SET gtin = ? WHERE Matnr = ?", [upc, matnr])
            console.log(res)
        }catch(e){
            console.log(e)
        }


        await timer(5500)
    }
}

run();