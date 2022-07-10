const Database = require('Database');

async function run(){
    let Matnr = Database.generateMatnr(7);
    
    let res = await Database.makeQuery2("SELECT * FROM products");

    
}