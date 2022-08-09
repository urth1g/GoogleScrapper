const Database = require('../db/db');
const { getFeedSheet } = require('../google/getFeedSheetData'); 

const timer = ms => new Promise(resolve => setTimeout(resolve, ms))
async function run(){
    const sheet = await getFeedSheet()

    let row = await sheet.loadCells(); // loads a range of cells
    const rows = await sheet.getRows({limit: 8002, offset: 1064}); // can pass in { limit, offset }

    for(let row of rows){
        let links = row["link"].split("/");
        let matnr= links[links.length - 1];

        console.log(matnr)
        let img = await Database.makeQuery2("SELECT * FROM inventory_log INNER JOIN products ON inventory_log.Matnr = products.Matnr WHERE products.Matnr = ?", [matnr])

        console.log(img)
        console.log(img[0])
        row.price = img[0].Price + ' USD'
        console.log('saving...')
        await row.save()
        await timer(1500)
    }
}

//run()