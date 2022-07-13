const Database = require("../db/db");
const fs = require('fs')

const timer = ms => new Promise(res => setTimeout(res, ms))

async function run(class1, subclass){

    let res = await Database.makeQuery2("SELECT ShortName, LongName, products.Matnr, products.mpn, models_information.Model FROM products LEFT JOIN models_information on products.Matnr = models_information.Matnr WHERE Class LIKE '%" + class1 + "%' AND SubClass LIKE '%" + subclass + "%' AND mpn != '' AND models_information.Model IS NULL ORDER BY RAND();")

    console.log(res.length)
    for(let i = 0; i < 1; i++){
        let r = res[i]
        console.log(r.mpn)
        let resp = await Database.makeQuery2("INSERT into models_information (Matnr, Model) VALUES (?,?)", [r.Matnr, r.mpn])
        console.log(resp)
        await timer(200)
    }
}

if(process.argv.length !== 2){
    if(process.argv.includes("--ignore-word")){
        console.log(process.argv)
        let word = process.argv[3]
        let ignore_exclusion_wordlist = process.argv[4]
        let exclude_if_wordlist = process.argv[5]
        excludeWord(word, ignore_exclusion_wordlist, exclude_if_wordlist)
    }

    if(process.argv.includes("--with-class")){
        run(process.argv[3], process.argv[4])
    }
}
