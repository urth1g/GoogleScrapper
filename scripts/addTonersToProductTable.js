const Database = require("../db/db");

async function run(){
    let resp = await Database.makeQuery2("SELECT * FROM toner_details_final");

    let dict = {}

    let b = 0;
    for(let i = 0; i < resp.length; i++){

        let Matnr = resp[i].Matnr;

        if(dict[Matnr]) continue;
        else dict[Matnr] = true;

        let resp2 = await Database.makeQuery2("SELECT * FROM products WHERE Matnr = ?", [Matnr])

        console.log(resp2.length)

        let Class = 'Printer Consumables'
        let SubClass = 'Toner Cartridges'
        let Price = resp[i].Cost
        let Thumbnail = ''
        let gtin = ''
        let mpn = ''
        let timestamp = null;
        let ShortName = resp[i].Name 
        let LongName = resp[i].Name

        if(resp2.length === 0){
            let res = await Database.makeQuery2("INSERT INTO products ( Matnr, ShortName, LongName, Class, SubClass, Price, Thumbnail, gtin, mpn ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
            [Matnr, ShortName, LongName, Class, SubClass, Price, Thumbnail, gtin, mpn])
            console.log(res)
        }

    }
}

run();