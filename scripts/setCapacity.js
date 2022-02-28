const Database = require('../db/db');


async function setCapacity(){
    let items = await Database.getInstance().promise().query("SELECT Capacity, Matnr FROM toner_details_final")
    items = items[0]

    items.forEach(async x => {
        let res = await Database.db2.promise().query("UPDATE toner_details_final SET Capacity = ? WHERE Matnr = ?", [x.Capacity, x.Matnr])
        console.log(res)
    })

}

setCapacity();