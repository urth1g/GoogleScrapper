const Database = require('../db/db')


const timer = ms => new Promise( resolve => setTimeout(resolve, ms))
async function removeDuplicates(class1, subclass){
    let res = await Database.makeQuery2("SELECT * FROM products INNER JOIN models_information ON products.Matnr = models_information.Matnr WHERE SubClass LIKE '%Rack%';")

    console.log(res.length)

    for(let r of res){  

        let queryResult = await Database.makeQuery2("DELETE FROM models_information WHERE Matnr = ?", [r.Matnr])
        console.log(queryResult)
        await timer(5)
    }
}

let c = process.argv[2]
let sc = process.argv[3]

removeDuplicates()