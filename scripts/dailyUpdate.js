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

	//let res = await Database.makeQuery("SELECT * FROM products LEFT JOIN inventory_log ON products.Matnr = inventory_log.Matnr LEFT JOIN models_information ON models_information.Matnr = products.Matnr WHERE inventory_log.updated_at NOT LIKE '%" + notLikeThisDate + "%' GROUP BY products.Matnr ORDER BY products.Price");

    setTimeout( () => process.exit(1), 40000)
    let sql = "SELECT * FROM inventory_log WHERE (inventory_log.updated_at < '" + notLikeThisDate + "' OR inventory_log.updated_at IS NULL) AND Link != 'Nothing found.' ORDER BY RAND() LIMIT 1";
    //let sql = 'SELECT COALESCE(inventory_log.Matnr, models_information.Matnr) as Matnr FROM models_information LEFT JOIN inventory_log ON models_information.Matnr = inventory_log.Matnr WHERE inventory_log.Matnr IS NULL ORDER BY RAND() LIMIT 1';
    let res = await Database.makeQuery2(sql)
	let printers = res;

    for(let i = 0; i < 1; i++){
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
            //await axios.post('http://localhost:3030/update_spreadsheet_price', {matnr} )
            console.log('updated_123')
            //await timer(2000)
        }catch(e){
            console.log(e)
        }
    }

}

var arguments = process.argv ;
  
if(arguments[2] === 'start') run()

module.exports = run;