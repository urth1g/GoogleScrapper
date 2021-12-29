const Database = require('../db/db');

function getAccessories(){
	return new Promise((resolve, reject) => {
		Database.getInstance().query("SELECT * FROM accessories", (err, res) => {
			if(err) reject(err);

			resolve(res)
		})
	})
}

module.exports = { getAccessories };