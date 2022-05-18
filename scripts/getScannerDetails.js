const Database = require('../db/db');
const axios = require('axios');
const cheerio = require('cheerio');

async function getTokenFromDB(){
	let result = await Database.makeQuery2("SELECT value FROM configuration WHERE action = 'techdata_token'");

	let token = result[0];

	return token;
}


async function run(){

    let timer = ms => new Promise(res => setTimeout(res, ms))

    let scanners = await Database.makeQuery2("SELECT * FROM products WHERE Class LIKE '%Scanners%'")

    for(let s of scanners){

        let matnr = s['Matnr'];

        let insideAlready = await Database.makeQuery2("SELECT * FROM scanner_details_final WHERE Matnr = ?", [matnr])

        if(insideAlready.length !== 0) continue;

        let res4 = await axios.get(`https://shop.techdata.com/api/products/detailedspecs/${matnr}`, {headers:{
            'Cookie': token.value,
            'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36',
        }})

        let { sections } = res4.data

        sections = sections.filter(x => x.name === 'Main');

        let JSONs = JSON.stringify(sections[0].specs)


        try{
            let dbCall = await Database.makeQuery2("INSERT INTO scanner_details_final (Matnr, Details) VALUES (?,?)", [matnr, JSONs])
            console.log(dbCall)
        }catch(e){
            console.log(e);
            continue;
        }


        await timer(5000)
    }
    

}

run();