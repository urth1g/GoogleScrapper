const Database = require('../db/db');
const axios = require('axios');
const cheerio = require('cheerio');

function generateString(length) {
    const characters ='123456789';
    let result = '1';
    const charactersLength = characters.length;
    for ( let i = 0; i < length; i++ ) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return Number(result);
}

function genRand(min, max, decimalPlaces) {  
    var rand = Math.random() < 0.5 ? ((1-Math.random()) * (max-min) + min) : (Math.random() * (max-min) + min);  // could be min or max or anything in between
    var power = Math.pow(10, decimalPlaces);
    return Math.floor(rand*power) / power;
}

async function run(){
    let res = await Database.makeQuery2("SELECT *, COALESCE(toner_details_final.Matnr, 'nomatnr') as Matnr FROM toner_details_final LEFT JOIN products ON toner_details_final.PrinterNumber = products.Matnr GROUP BY toner_details_final.Matnr");

    let dict = {}

    for(let r of res){

        let NameShort = r.Name.split(" - ")[0];

        let printerType = r.ShortName.includes("color") ? 'color' : 'B/W';

        if(printerType === 'B/W' && r.imgURL !== 'no-url') continue;

        if(r.Color.includes(",")) continue;

        if(NameShort === 'Lexmark') continue;
     
        if(!NameShort.startsWith("HP")) continue;

        let indToReplace = -1;

        let splitToFindColor = r.Name.split(" - ");

        for(let i = 0; i < splitToFindColor.length; i++){
            let s = splitToFindColor[i]

            if(s.includes("black") || s.includes("yellow") || s.includes("magenta") || s.includes("cyan")){
                indToReplace = i;
            }
        }

        if(!dict[NameShort]){
            dict[NameShort] = [{color: r.Color, name: r.Name, indToReplace: indToReplace, matnr: r.Matnr, Model: r.Model, Pack: r.Pack }]
        }else{
            dict[NameShort].push({color: r.Color, name: r.Name, indToReplace: indToReplace, matnr: r.Matnr, Model: r.Model, Pack: r.Pack })
        }
    }

    console.log(dict)
    for(let d in dict){
        let curColors = ["yellow", "cyan", "magenta", "black"]

        for(let c of [...curColors]){
            for(let i = 0; i < dict[d].length; i++){

                if(dict[d][i]["color"].includes(c)){
                    let ind = curColors.indexOf(c);
                    curColors.splice(ind, 1)
                }
                
            }
        }

        let { matnr, name, indToReplace, Model, Pack } = dict[d][0]

        let _name = name.split(" - ");

        for(let c of curColors){
            _name[indToReplace] = c;
            let sql = "INSERT INTO toner_details_final (PrinterNumber, Matnr, Name, Capacity, Cost, imgURL, productURL, Rating, Model, Color, Pack, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"

            let PrinterNumber = 0;
            let Matnr = generateString(7);
            let Name = _name.join(" - ")
            let Capacity = 1000;
            let Cost = 15.55;
            let imgURL = "no-img"
            let productURL = "no-url"
            let Rating = genRand(4.4, 5.01, 1);
            let Color = c;  
            let updated_at = null;

            //let res = await Database.makeQuery(sql, [PrinterNumber, Matnr, Name, Capacity, Cost, imgURL, productURL, Rating, Model, Color, Pack, updated_at])
            //console.log(res)
        }

    }




}

run()