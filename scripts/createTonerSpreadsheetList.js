const Database = require('../db/db');
const { getFeedSheet } = require('../google/getFeedSheetData'); 

const timer = ms => new Promise(resolve => setTimeout(resolve, ms))
async function run(){
    const sheet = await getFeedSheet()

    let row = await sheet.loadCells(); // loads a range of cells

    const toners = await Database.makeQuery2("SELECT * FROM toner_details_final INNER JOIN images ON toner_details_final.Matnr = images.Matnr INNER JOIN products ON toner_details_final.Matnr = products.Matnr GROUP BY toner_details_final.Matnr");

    let dict = {}


    for(let toner of toners){

        if(dict[toner['Matnr']]) continue;
        else dict[toner['Matnr']] = true;
        
        let mpn = toner['mpn'];
        let title = toner['Name'].split(" - ")[0]
        let price = toner['Cost'] + ' USD';
        let id = toner['id'];
        let link = 'https://amofax.com/item/' + toner['Matnr']
        let description = toner['LongName'] || toner['Name']
        let gtin = toner['gtin']
        let availability = 'in_stock'
        let excluded_destination = '';
        let brand = null;
        if(title.split(" ").length > 1) brand = title.split(" ")[0]
        else brand = title; 
        let condition = 'new';
        let google_product_category = '356'
        let product_type = 'Toners'
        let shipping = 'US:::0 USD';
        let image_link = toner['url'];

        await sheet.addRow({mpn, title, price, id, link, description, gtin, image_link, availability, excluded_destination, brand, condition, google_product_category, product_type, shipping})
        console.log('added')
        await timer(4000)
    }
    
}

run();