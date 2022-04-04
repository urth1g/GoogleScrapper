const mysql = require('mysql2');
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
		  connectionLimit: 10,
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

	static async makeQuery2(query, params){
		let res = await Database.getInstance().promise().query(query, params)
		return res[0]
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
}


module.exports = Database;