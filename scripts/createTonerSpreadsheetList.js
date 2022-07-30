const Database = require('../db/db');
const { getFeedSheet } = require('../google/getFeedSheetData'); 

const timer = ms => new Promise(resolve => setTimeout(resolve, ms))
async function run(){
    const sheet = await getFeedSheet()

    let row = await sheet.loadCells(); // loads a range of cells
    const rows = await sheet.getRows(); // can pass in { limit, offset }
    let filtered = rows.map(x => Number(x.id))

    const items = await Database.makeQuery2("SELECT * FROM products INNER JOIN inventory_log ON inventory_log.Matnr = products.Matnr WHERE inventory_log.Link != 'Nothing Found.'")

    let toPush = [];

    let dict = {}
    for(let item of items){

        if(dict[item['Matnr']]) continue;
        else dict[item['Matnr']] = true;
        
        if(filtered.indexOf(item.id) !== -1) {
            console.log('skipped')
            continue
        }
        let mpn = item['mpn'];
        let title = item['ShortName'].split(" - ")[0]
        let price = item['Price'] + ' USD';
        let id = item['id'];
        let link = 'https://amofax.com/item/' + item['Matnr']
        let description = item['LongName'] || item['Name']
        let gtin = item['gtin']
        let availability = 'in_stock'
        let excluded_destination = '';
        let brand = null;
        if(title.split(" ").length > 1) brand = title.split(" ")[0]
        else brand = title; 
        let condition = 'new';
        //let google_product_category = 
        let product_type = item['SubClass']
        let shipping = 'US:::0 USD';
        let image_link = item['url'];

        //await sheet.addRow({mpn, title, price, id, link, description, gtin, image_link, availability, excluded_destination, brand, condition, product_type, shipping})
        //await timer(4000)

        toPush.push({mpn, title, price, id, link, description, gtin, image_link, availability, excluded_destination, brand, condition, product_type, shipping})
    }   

    console.log(toPush.length)
    for(let i = 0; i < toPush.length; i+=100){
        
        let sliced = toPush.slice(i, i+100)

        await sheet.addRows(sliced)
        await timer(5000)
    }
    
}

run();