const Database = require('../db/db');



async function run(){
    const toners = await Database.makeQuery2("SELECT * FROM toner_details_final");

    const dict = {}

    console.log(toners.length)

    for(let i = 0; i < toners.length; i++){
        let Matnr = toners[i].Matnr

        if(dict[Matnr]) continue
        else dict[Matnr] = true

        let model = toners[i].Name.split(" - ")[0].split(" ")[1]

        let rs = await Database.makeQuery2("UPDATE inventory_log SET updated_at = ? WHERE Matnr = ?", ['1997-02-02 04:51:01', Matnr])
        console.log(rs)
    }
}

run();