const Database = require('../db/db');
const axios = require('axios');

const timer = ms => new Promise(res => setTimeout(res, ms))

function getFormattedDate(){
    var d = new Date();

    d = d.getUTCFullYear() + "-" + ('0' + (d.getUTCMonth() + 1)).slice(-2) + "-" + ('0' + d.getUTCDate()).slice(-2);

    return d;
}

async function run(){


    let notLikeThisDate = getFormattedDate();

	let res = await Database.makeQuery("SELECT *, inventory_log.updated_at FROM products INNER JOIN inventory_log ON products.Matnr = inventory_log.Matnr WHERE (inventory_log.updated_at NOT LIKE '%" + notLikeThisDate + "%' AND SubClass LIKE '%Laser%') OR ( SubClass LIKE '%Multifunction%' AND LongName LIKE '%Laser%' AND inventory_log.updated_at NOT LIKE '%" + notLikeThisDate +"%') GROUP BY products.Matnr ORDER BY products.Price");

	let printers = res[0];

    let ignoredMatnrs = await Database.makeQuery2("SELECT Matnr FROM products_locktable");

    for(let object of ignoredMatnrs){
        printers = printers.filter(x => Number(x.Matnr) !== Number(object.Matnr))
    }

    for(let i = 0; i < printers.length; i++){
        let matnr = printers[i].Matnr;

        try{
            console.log('Step 1 ---- Crawling Ebay for price initiated')
            await axios.post('http://localhost:3030/crawl_ebay_printer', {matnr} )
            console.log('Step 2 ---- Crawling Amazon for price initiated')
            await axios.post('http://localhost:3030/crawl_amazon_printer', {matnr} )
            console.log('Step 3 ---- Crawling Techdata for price initiated')
            await axios.post('http://localhost:3030/crawl_techdata_printer', {matnr} )
            console.log('Step 4 ---- Setting the price based on feed initiated')
            await axios.post('http://localhost:3030/crawl_for_printer', {matnr} )
            console.log('Step 5 ---- Checking for any ULTRA GOOD deals')
            await axios.post('http://localhost:3030/check_for_good_deals', {matnr} )
            console.log('Step 6 ---- Updating the price in google feed initiated')
            await axios.post('http://localhost:3030/update_spreadsheet_price', {matnr} )
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