const Database = require('../db/db');

async function getInventory(matnr){
	console.log(matnr)
	let res = await Database.getInstance().promise().query('SELECT * FROM inventory WHERE Matnr = ?', [matnr])

	return new Promise( (resolve, reject) => {
		resolve(res[0][0])
	})
}

module.exports = getInventory;