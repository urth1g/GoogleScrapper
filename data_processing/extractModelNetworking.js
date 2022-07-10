const Database = require("../db/db");
const fs = require('fs')

const timer = ms => new Promise(res => setTimeout(res, ms))

async function run(class1, subclass){
    let res = await Database.makeQuery2("SELECT ShortName, LongName, Matnr FROM products WHERE Class LIKE '%" + class1 + "%' AND SubClass LIKE '%" + subclass + "%';")

    for(let i = 0; i < res.length; i++){
        let r = res[i]
        console.log('Index is: ', i)
        console.log(r)
        let split = r.ShortName.split(" - ")[0].split(" ")

        let model = null;
        for(let word of split){
            console.log(word)
            let resp = await Database.makeQuery2("SELECT * FROM wordlist WHERE exclude_word = ?", [word])


            if(resp.length !== 0){
                resp = resp[0]
                let shouldBreak = false;
                if(resp.exclude_if_wordlist !== '[]'){
                    let parse = JSON.parse(resp.exclude_if_wordlist)
    
                    for(let wc of parse){
                        if(split.includes(wc)){
                            shouldBreak = true;
                            break;
                        }
                    }
                if(shouldBreak) continue;

                }else{
                    continue;
                }
    
            }
            
            model = word;
        }

        console.log('Model is: \n')
        console.log(model)

        fs.writeFile('./models.txt', model + " - " + split + " - " + r.Matnr + "\r\n", { flag: 'a+' }, err => {})

        let resp = await Database.makeQuery2("INSERT into models_information (Matnr, Model) VALUES (?,?)", [r.Matnr, model])
        //let resp = await Database.makeQuery2("DELETE FROM models_information WHERE Matnr = ?", [r.Matnr])
        console.log(resp)
        //await timer(1000)
    }
}

async function excludeWord(word, ignore_exclusion_wordlist = '[]', exclude_if_wordlist = '[]'){
    let resp = await Database.makeQuery2("INSERT INTO wordlist (exclude_word, ignore_exclusion_wordlist, exclude_if_wordlist) VALUES(?,?,?)", [word, ignore_exclusion_wordlist, exclude_if_wordlist])
    console.log(resp)
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
