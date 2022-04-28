const { searchGoogle, findTheBestPrice, findAverage } = require('../google/googleScrapper');
const { searchAmazon, findTheBestPriceAmazon } = require('../amazon/amazonScrapper');
const { searchEbay, findTheBestPriceEbay } = require('../ebay/ebayScrapper');
const { searchAmazonToners } = require('../amazon/amazonTonerScrapper');

class Crawler{
    filterFunction;
    crawlAlgorithm;
    
}

module.exports = Crawler;