const Database = require('../db/db')

async function removeDuplicates(class1, subclass){
    let res = await Database.makeQuery2("SELECT ShortName, LongName, Matnr FROM products WHERE Class LIKE '%" + class1 + "%' AND SubClass LIKE '%" + subclass + "%';")

    let dict = {}
    let duplicates = []
    for(let r of res){
        let matnr = r.Matnr
        let ShortName = r.ShortName.split(" - ")[0]
        if(!dict[ShortName]){
            dict[ShortName] = matnr;
        }else{
            duplicates.push({duplicateMatnr: matnr, duplicateOf: dict[ShortName]})
        }
    }

    for(let d of duplicates){
        let res = await Database.makeQuery2("DELETE FROM products WHERE Matnr = ? LIMIT 1", [d.duplicateMatnr])
        console.log(res)
    }
}

let c = process.argv[2]
let sc = process.argv[3]

if(sc){
    removeDuplicates(c, sc)
}