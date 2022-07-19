const Database = require('../db/db');
const randomNum = require('../helpers/randomNum');

class PriceSetter{
    constructor(shops, matnr){
        this.shops = shops;
        this.shopsInit = shops;
        this.price = 0;
        this.sources = [];
        this.matnr = matnr;
    }



    async extractMarginRuleNumber(price){

		let profitMargins = await Database.makeQuery2("SELECT * FROM profit_margins");

        if(profitMargins.length === 0) return 0;

        for(const margin of profitMargins){
            let { PriceMinimum, PriceMaximum, Profit } = margin;
            
            if(price > PriceMinimum && price <= PriceMaximum){
                return Number(Profit); 
            }
        }

        return 0;
    }

    async filterShopsBasedOnSources(matnr){
        let sources = [];

        let inventory = await Database.getSources(matnr)

        let Amazon = null,
            Ebay = null,
            Techdata = null;
        if(inventory.length === 0) return this.shops

        try{
            Amazon = JSON.parse(inventory.Amazon);
            Ebay = JSON.parse(inventory.Ebay);
            Techdata = JSON.parse(inventory.Techdata);
        }catch(er){
            console.log(er)
        }

        console.log(Techdata)

        if(Amazon) sources.push(...Amazon.map(x => x));
        if(Ebay) sources.push(...Ebay.map(x => x));
        if(Techdata) sources.push(...Techdata.map(x => x ));

        sources.sort((a,b) => a.price - b.price);

        console.log(sources)
        sources = await Promise.all(sources.map(async x => {
			let taxed = Math.ceil(x.price * 1.07)
			let afterCreditCardFees = Math.ceil(taxed * 1.045)
			let margin = await this.extractMarginRuleNumber(taxed)
			let net = afterCreditCardFees + margin

			//let computed = { taxed, afterCreditCardFees, margin, net}

            return {net: net, state: x.state || ''}
        }))


        this.sources = sources;

        sources = sources.filter(x => x.state.toLowerCase().includes('new') || x.state.toLowerCase().includes('open'))

        if(sources.length === 0) {
            return this.shops;
        }

        return this;
    }

    async filterOnAuthenticity(){
        let sources = this.sources.filter(x => x.isGenuine)

        console.log(this.sources)
        if(sources.length !== 0) this.shops = this.shops.filter( x => x.price > sources[0].net)
        return this;
    }

    async getSourcesNetPrices(matnr){
        let sources = [];

        let inventory = await Database.getSources(matnr)

        console.log(inventory)
        let Amazon = null,
            Ebay = null,
            Techdata = null;
        if(inventory.length === 0) return this.shops

        try{
            Amazon = JSON.parse(inventory.Amazon);
            Ebay = JSON.parse(inventory.Ebay);
            Techdata = JSON.parse(inventory.Techdata);
        }catch(er){
            console.log(er)
        }

        if(Amazon) sources.push(...Amazon.map(x => x));
        if(Ebay) sources.push(...Ebay.map(x => x));
        if(Techdata) sources.push(...Techdata.map(x => {
            return { ...x, state: 'new'}
        } ));

        sources.sort((a,b) => a.price - b.price);

        sources = await Promise.all(sources.map(async x => {
			let taxed = Math.ceil(x.price * 1.07)
			let afterCreditCardFees = Math.ceil(taxed * 1.045)
			let margin = await this.extractMarginRuleNumber(taxed)
			let net = afterCreditCardFees + margin

			//let computed = { taxed, afterCreditCardFees, margin, net}

            return {net: net, state: x.state || '', isGenuine: x.isGenuine}
        }))



        this.sources = sources;
        return sources;
    }

    async applyMargins(callback, toner, url){

        console.log(this.shops)
        console.log(this.sources)
        if(this.shops.length === 0){
            let sources = this.sources.filter(x => x.state.toLowerCase().includes('new') || x.state.toLowerCase().includes('open') )
            sources = sources.filter(x => x.isGenuine)
            if(sources.length === 0){
                console.log("unable")
                await Database.setInventoryLog(this.matnr, '[]')
                throw new Error("Unable to beat any shop")
            }else{
                try{
                    if (!callback) await Database.setProductPrice(this.matnr, sources[0].net)
                    else callback(sources[0].net, toner, url)

                    await Database.setInventoryLog(this.matnr, JSON.stringify(this.shops))
                    throw new Error("Unable to beat any shop. Setting the price based on best source.")
                }catch(e){
                    console.log(e)
                    throw new Error(e)
                }
            }
        }

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


module.exports = PriceSetter