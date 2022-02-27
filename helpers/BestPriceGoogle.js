const __subsets = require('./subsets');
const d1 = require('./search')
const tsfc = require('./transformStringForComparison');
const Database = require('../db/db');
const fs = require('fs')

class BestPriceGoogle{
    constructor(data){
        this.data = data
        this.shops = []
        this.catalog = []
        this.inventory = null
    }

    async getShops(){
        let regex2 = /<span class="[a-zA-Z]{6}">((?:(?!img).)+?)</g;
        let matches = regex2.exec(this.data);

        do{
            this.shops.push(matches[1]);
        } while((matches = regex2.exec(this.data)) !== null)
    }

    async generatePrices(){
        if(this.shops.length === 0){
           throw new Error('Generate a list of shops first.')
        }
        let regex = /<td>Total price.+?\$(.+?)</g;

        let matches = regex.exec(this.data)
        let temp = [...this.shops]

        let catalog = []
        do{
            let price = parseFloat(matches[1].replace(/\,/g, ""));
            catalog.push({price, shop: temp.shift() })
        }while((matches = regex.exec(this.data)) !== null)

        catalog = catalog.filter(x => x.shop !== 'Amofax')

        this.catalog = catalog;
    }

    async getShopForOutbidding(shopsToExclude, shouldFilter){

        // Beat shop according to the cost of item stored in the inventory or according to nothing.

        let lowestCostListing = null;

        if(this.inventory){
            let temp = { ...this.inventory }

            for (const key in temp){
                if(!temp[key] || typeof temp[key] !== 'object') continue 
                if(temp[key].filter(x => x.isGenuine).length === 0) continue;

                let filtered = shouldFilter ? temp[key].filter(x => x.isGenuine) : temp[key]
                filtered.sort( (a, b) => a.price - b.price )

                if(!lowestCostListing){
                    lowestCostListing = filtered[0]
                }else{
                    if(lowestCostListing.price > filtered[0].price) lowestCostListing = filtered[0]
                }
            }     

            let indexOfShopToBeat = -1;

            this.catalog.forEach( (x, i) => {
                if(x.name === 'Amofax') return;

                if(shopsToExclude[x.shop]){
                    indexOfShopToBeat = i + 1
                }
            })

            if(indexOfShopToBeat >= this.catalog.length){
                indexOfShopToBeat -= 1
            }

            if(indexOfShopToBeat == -1){
                return this.catalog[0]
            }else{
                return this.catalog[indexOfShopToBeat]
            }
        }else{
            let indexOfShopToBeat = -1;
            
            this.catalog.forEach( (x, i) => {
                if(x.name === 'Amofax') return;

                if(shopsToExclude[x.shop]){
                    indexOfShopToBeat = i + 1
                }
            })

            if(indexOfShopToBeat >= this.catalog.length){
                indexOfShopToBeat -= 1
            }

            if(indexOfShopToBeat == -1){
                return this.catalog[0]
            }else{
                return this.catalog[indexOfShopToBeat]
            }
        }
    }

    async getInventory(matnr){
        let toner = await Database.getInstance().promise().query("SELECT * FROM inventory WHERE Matnr = ?", [matnr])

        toner = toner[0]

        if(toner.length <= 0) return false

        toner = toner[0]

        let isInventoryEmpty = Object.values(toner).every(x => !!x === false)

        if(isInventoryEmpty) return false;


        let inventory = {}

        for (const key in toner){
            if(!toner[key]) continue 

            inventory[key] = JSON.parse(toner[key])
        }

        this.inventory = inventory;
    }

    async updateTonerPrice(newPrice, toner, url){
        await Database.makeQuery("UPDATE toner_details_final SET Cost = ? WHERE Matnr = ?", [newPrice, toner['Matnr']])
        console.log('Updated price.')
        fs.writeFile('../tonersPricesSet.txt', `Price of ${toner['Matnr']} set to ${newPrice}`, { flag: 'a+' }, err => {})
        console.log('Written output to file.')
        
        try{
            await Database.makeQuery("INSERT INTO inventory_log VALUES (?,?,?,?)", [toner['Matnr'], toner['Name'], JSON.stringify(this.catalog), url])
        }catch(e){
            if(e.errno === 1062){
                await Database.makeQuery("UPDATE inventory_log SET Name = ?, Inventory = ?, Link = ? WHERE Matnr = ?", [        
                    toner['Name'],
                    JSON.stringify(this.catalog),
                    url,
                    toner['Matnr']
                ])
            }
        }

        console.log('Inventory logs updated.')
    }
}

module.exports = BestPriceGoogle;