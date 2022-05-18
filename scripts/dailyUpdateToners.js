const Database = require('../db/db');
const axios = require('axios');

const timer = ms => new Promise(res => setTimeout(res, ms))

function getFormattedDate(){
    var d = new Date();

    d = d.getUTCFullYear() + "-" + ('0' + (d.getUTCMonth() + 1)).slice(-2) + "-" + ('0' + d.getUTCDate()).slice(-2);

    return d;
}

async function run(){


    let notLikeThisDate = getFormattedDate()

	//let res = await Database.makeQuery("SELECT *, inventory_log.updated_at FROM toner_details_final LEFT JOIN inventory_log ON toner_details_final.Matnr = inventory_log.Matnr WHERE inventory_log.updated_at NOT LIKE '%" + notLikeThisDate + "%' GROUP BY toner_details_final.Matnr ORDER BY toner_details_final.Matnr");

    let res = await Database.makeQuery("SELECT toner_details_final.Matnr, inventory_log.updated_at, COALESCE (toner_details_final.Matnr, inventory_log.Matnr) as Matnr FROM toner_details_final LEFT JOIN inventory_log ON toner_details_final.Matnr = inventory_log.Matnr WHERE inventory_log.updated_at NOT LIKE '%" + notLikeThisDate + "%' OR inventory_log.updated_at IS NULL GROUP BY toner_details_final.Matnr ORDER BY toner_details_final.Matnr")
	let records = res[0];

    let ignoredMatnrs = await Database.makeQuery2("SELECT Matnr FROM products_locktable");

    console.log(records.length)
    for(let object of ignoredMatnrs){
        records = records.filter(x => Number(x.Matnr) !== Number(object.Matnr))
    }

    let dict = {};
    for(let i = 0; i < records.length; i++){
        let matnr = records[i].Matnr;

        if(dict[matnr]) continue;
        dict[matnr] = true;
        try{
            console.log('Step 1 ---- Crawling Ebay for price initiated')
            await axios.post('http://localhost:3030/crawl_ebay_toner', {matnr} )
            console.log('Step 2 ---- Crawling Amazon for price initiated')
            //await axios.post('http://localhost:3030/crawl_amazon_toner', {matnr} )
            console.log('Step 3 ---- Setting the price based on feed initiated')
            await axios.post('http://localhost:3030/crawl_google_toner', {matnr} )
            console.log('Step 4 ---- Checking for any ULTRA GOOD deals')
            await axios.post('http://localhost:3030/check_for_good_deals', {matnr} )
            //console.log('Step 5 ---- Updating the price in google feed initiated')
            //await axios.post('http://localhost:3030/update_spreadsheet_price', {matnr} )
            console.log('updated_123')
            await timer(2000)
        }catch(e){
            console.log(e)
        }
    }
}

var arguments = process.argv ;
  
if(arguments[2] === 'start') run()

module.exports = run;