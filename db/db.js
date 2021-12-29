const mysql = require('mysql2');

class Database {
	constructor(){
		this.db = null;
	}

	static createInstance(){
		this.db = mysql.createPool({
		  host     : process.env.DB_HOST,
		  user     : process.env.DB_USER,
		  password : '',
		  database : process.env.DB_NAME,
		  multipleStatements: true,
		  waitForConnections: true,
		  connectionLimit: 10,
		  queueLimit: 0
		});

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