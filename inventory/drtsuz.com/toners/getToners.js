const Database = require('../../../db/db');
const cheerio = require('cheerio');
const axios = require('axios');

const timer = ms => new Promise(res => setTimeout(res, ms))

async function run(){
    let url = process.argv[2]

    console.log(url)
    if(!url) console.log('No url specified.')

    let queue = [];

    try{
        let resp = await axios.get(url)

        const $ = cheerio.load(resp.data)
    
        let $productTile = $(".ProductTile_listakategorii");

        $productTile.each(async function(i){
            let text = $(this).text().trim();
            let href = $(this).parent().attr("href");
            
            let Model = text.split(" ")[1]

            if(Model === 'C-EXV') Model += " " + text.split(" ")[2]

            let doesntExist = (await Database.makeQuery2("SELECT * FROM toner_details_final WHERE Model LIKE '%" + Model + "%'")).length === 0;

            if(doesntExist) queue.push({text, href, model: Model})

            if(i === $productTile.length - 1) callback(queue)
        })

    }catch(e){
        console.log(e)
    }
}

async function callback(queue){
    try{
        while(queue.length !== 0){
            let firstItem = queue.shift();

            let resp = null;
            try{
                resp = await axios.get(firstItem.href)
            }catch(e){
                console.log(e)
                continue;
            }

            let $ = cheerio.load(resp.data)

            
            let $listings = $(".newlisting_box")

            $listings.each(async function(){
                let $information = $(this).find("td")

                let infoObject = {}

                let key = null;
                let value = null;

                $information.each(function(i){
                    let text = $(this).text().trim();

                    if(i % 2 === 0 && i !== 0){
                        infoObject[key] = value
                    }

                    if(i % 2 !== 0) value = text;
                    if(i % 2 === 0) key = text;

                    if(i === 0) key = text;


                })

                let { Class, Color, Yield } = infoObject

                if(!Color) Color = 'Black'
                let end = Class === 'Drum' ? 'drum unit' : 'toner cartridge';


                let sql = "INSERT INTO toner_details_final (PrinterNumber, Matnr, Name, Capacity, Cost, imgURL, productURL, Rating, Model, Color, Pack, updated_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)"

                let PrinterNumber = 0;
                let Matnr = Database.generateMatnr(7);
                console.log(infoObject)
                let Name = `${infoObject['Manufactured by']} ${firstItem.model} - ${Color.toLowerCase()} - ${infoObject['Type'].toLowerCase()} - ${end}`
                let Capacity = Yield ? Number(Yield.split(" ")[0]) : 0
                let Cost = 15.55;
                let imgURL = "no-img"
                let productURL = "no-url"
                let Rating = Database.generateRating(4.4, 5.01, 1);
                let updated_at = null;
                Color = Color.toLowerCase();
                let mpn = infoObject['Catalog Number']

                let res = await Database.makeQuery2(sql, [PrinterNumber, Matnr, Name, Capacity, Cost, imgURL, productURL, Rating, firstItem.model, Color, null, null])

                let SubClass = Class === 'Drum' ? 'Drum Units' : 'Toner Cartridges';

                let res2 = await Database.makeQuery2("INSERT INTO products ( Matnr, ShortName, LongName, Class, SubClass, Price, Thumbnail, gtin, mpn ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
                [Matnr, Name, Name, 'Printer Consumables', SubClass, Cost, '//noimg', '', mpn])
                console.log(res)
                console.log(res2)
                
            })
            await timer(5000)
        }

    }catch(e){
        console.log(e)
    }
}

run();
