const Database = require('../db/db');

async function findLongest(){
	let maxValue = Number.MIN_SAFE_INTEGER;

	try{
		const values = await Database.getInstance().promise().query("SELECT ShortName FROM products WHERE Class LIKE '%Printers%'")
		values[0].forEach(x => {
			let value = x.ShortName.length;

			if(value >= 155){
				console.log(x)
			}
			if(value > maxValue) maxValue = value;
		})
	}catch(e){
		console.log(e)
	}

	console.log(maxValue)
}

findLongest();