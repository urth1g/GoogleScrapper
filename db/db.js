const mysql = require('mysql2');

class Database {
	constructor(){
		this.db = null;
	}

	static async createInstance(){
		this.db = mysql.createPool({
		  host     : process.env.DB_HOST,
		  user     : process.env.DB_USER,
		  password : process.env.DB_PASSWORD || '',
		  database : process.env.DB_NAME,
		  port : process.env.DB_PORT || 3306,
		  multipleStatements: true,
		  waitForConnections: true,
		  connectionLimit: 10,
		  queueLimit: 0
		})

		await this.db.getConnection(err => {
			if(err){
				process.exit(1);
			}
		})
		console.log('test')

		return this.db
	}

	static getInstance(){
		if(!this.db){
			this.db = Database.createInstance()
		}

		return this.db;
	}
}


module.exports = Database;