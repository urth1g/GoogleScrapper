const Database = require('../db/db');
const randomNum = require('../helpers/randomNum');

class PriceSetter{
    constructor(shops){
        this.shops = shops;
        this.shopsInit = shops;
        this.price = 0;
    }

    async filterShopsBasedOnSources(matnr){
        let sources = [];

        let inventory = await Database.getSources(matnr)

        let Amazon = null,
            Ebay = null,
            Techdata = null;
        if(inventory.length === 0) return shops

        try{
            Amazon = JSON.parse(inventory[0].Amazon);
            Ebay = JSON.parse(inventory[0].Ebay);
            Techdata = JSON.parse(inventory[0].Techdata);
        }catch(er){
            console.log(er)
        }

        if(Amazon) sources.push(...Amazon.map(x => x.price));
        if(Ebay) sources.push(...Ebay.map(x => x.price));
        if(Techdata) sources.push(...Techdata.map(x => x));

        sources.sort((a,b) => a - b);
        
        this.shops = this.shops.filter( x => x.price > sources[0])
        return this;
    }

    async applyMargins(){
        let margins = await Database.getMargins();

        let price = this.shops[0].price;

        let initialPrice = price;

        for(let margin of margins){
            let { Minimum, Maximum, CutMinimum, CutMaximum } = margin;

            if(CutMaximum.indexOf("%") === -1){
                CutMaximum = Number(CutMaximum)
            }

            if(CutMinimum.indexOf("%") === -1){
                CutMinimum = Number(CutMinimum)
            }

            if(price >= Minimum && price < Maximum){
                let rand = randomNum(CutMinimum, CutMaximum);

                price -= rand
                break;
            }
        }

        if(initialPrice === price) throw new Error(`Price '${price}' is not found in any Margin rule. Please click on Margins and create a new price rule.`);

        this.price = price;
        return this;
    }

    async filterShopsBasedOnIgnoreList(){
        let ignoreList = await Database.getIgnoredShops()

        for(let ignoredShop of ignoreList){
            this.shops = this.shops.filter(x => x.shop !== ignoredShop.ShopName)
        }

        return this;
    }

}

const run = async () => {

}

//run();

module.exports = PriceSetter