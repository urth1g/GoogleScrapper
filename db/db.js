const mysql = require('mysql2');
const axios = require('axios');
require('dotenv').config({path: require('path').resolve(__dirname,'../.env')})

class Database {
	constructor(){
		this.db = null;
	}

	static createInstance(){
		this.db = mysql.createPool({
		  host     : process.env.DB_HOST,
		  user     : process.env.DB_USER,
		  password : process.env.DB_PASSWORD,
		  database : process.env.DB_NAME,
		  port : process.env.DB_PORT,
		  multipleStatements: true,
		  waitForConnections: true,
		  connectionLimit: 120,
		  queueLimit: 0
		})

		this.db.getConnection(err => {
			if(err){
				console.log(err)
				process.exit(1);
			}
		})

		return this.db;
	}

	static getInstance(){
		if(!this.db){
			this.db = Database.createInstance()
		}

		return this.db;
	}

	static async makeQuery(query, params){
		let res = await Database.getInstance().promise().query(query, params)
		return res
	}

	// static async makeQuery2(query, params){
	// 	let res = await Database.getInstance().promise().query(query, params)
	// 	return res[0]
	// }

	static async makeQuery2(query, params){

		// return new Promise( (resolve, reject) => {
		// 	Database.getInstance().getConnection(async function(err, conn) {

		// 		let res = await conn.promise().query(query, params);

		// 		if(conn) conn.release()
	
		// 		resolve(res[0])
		// 		res[0] = null;
		// 		return;
		// 	})
		// })

		let res = await axios.post("http://personal-server.xyz:4901/query", {query, params, key: process.env.KEY})
		return res.data;

	}

	static async getSources(matnr){
		let res = await Database.makeQuery("SELECT * FROM inventory WHERE Matnr = ? ", [matnr])
		return res[0]
	}

	static async getMargins(){
		let res = await Database.makeQuery("SELECT * FROM margins");
		return res[0]
	}

	static async getIgnoredShops(){
		let res = await Database.makeQuery("SELECT * FROM inventory_ignore")
		return res[0]
	}

	static async setProductPrice(Matnr, newPrice){
		return new Promise( (resolve, reject ) => {
			Database.getInstance().query("UPDATE products SET price = ? WHERE Matnr = ?", [newPrice, Matnr], (err, result) => {
				if(err) reject(err)
	
				resolve(result)
			})
		})
	}

	static async setInventoryLog(Matnr, inventory){
		let res = await Database.makeQuery2("UPDATE inventory_log SET Inventory = ? WHERE Matnr = ?", [inventory, Matnr])
		return res
	}

	static generateMatnr(length) {
		const characters ='123456789';
		let result = '1';
		const charactersLength = characters.length;
		for ( let i = 0; i < length; i++ ) {
			result += characters.charAt(Math.floor(Math.random() * charactersLength));
		}
	
		return Number(result);
	}

	static generateRating(min, max, decimalPlaces) {  
		var rand = Math.random() < 0.5 ? ((1-Math.random()) * (max-min) + min) : (Math.random() * (max-min) + min);  // could be min or max or anything in between
		var power = Math.pow(10, decimalPlaces);
		return Math.floor(rand*power) / power;
	}
}


module.exports = Database;