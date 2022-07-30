const Database = require('../db/db');
const { getFeedSheet } = require('../google/getFeedSheetData'); 

const timer = ms => new Promise(resolve => setTimeout(resolve, ms))
async function run(){
    const sheet = await getFeedSheet()

    let row = await sheet.loadCells(); // loads a range of cells
    const rows = await sheet.getRows({limit: 16, offset: 8995}); // can pass in { limit, offset }

    for(let row of rows){
        let links = row["link"].split("/");
        let matnr= links[links.length - 1];

        let img = await Database.makeQuery2("SELECT * FROM images WHERE Matnr = ?", [matnr])

        row.image_link = img[0].url
        console.log('saving...')
        await row.save()
        await timer(2900)
    }
}

run()