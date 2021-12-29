const Database = require('../db/db');

function getPrinters(){
	return new Promise((resolve, reject) => {
		Database.getInstance().query("SELECT * FROM products WHERE Class LIKE '%Printers%'", (err, res) => {
			if(err) reject(err);

			resolve(res)
		})
	})
}

module.exports = { getPrinters };