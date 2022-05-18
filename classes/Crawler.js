const { searchGoogle, findTheBestPrice, findAverage } = require('../google/googleScrapper');
const { searchAmazon, findTheBestPriceAmazon } = require('../amazon/amazonScrapper');
const { searchEbay, findTheBestPriceEbay } = require('../ebay/ebayScrapper');
const { searchAmazonToners } = require('../amazon/amazonTonerScrapper');
const { filter } = require('domutils');
const axios = require('axios');
const Helpers = require("../helpers/helpers.js");

const timer = ms => new Promise(res => setTimeout(res, ms))

class Crawler{

    googleHelpers;

    constructor(){
        this.googleHelpers = new Helpers()
    }

    async searchForItem(){

    }
}

module.exports = Crawler;