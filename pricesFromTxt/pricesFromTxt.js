const fs = require('fs');
const Database = require('../db/db');
function pricesFromTxt(){
	let regex = /of\s(.+?)(?=to\s\().+?\d+.?\d+\s\-\s(\d+.?\d+)/g;

	try {
	  const data = fs.readFileSync('./writeToTxt.txt', 'utf8')
	  //console.log(data)

	  let match = regex.exec(data);

	  do{
	  	let printerName = match[1];
	  	let price = match[2];

	  	console.log(printerName)
	  	console.log(price)
		Database.getInstance().query("UPDATE products SET price = ? WHERE ShortName = ?", [Number(price), printerName.trim()], (err, result) => {
			if(err) console.log(err)

			console.log(result)
		})

	  }while( (match = regex.exec(data)) !== null)
	} catch (err) {
	  console.error(err)
	}
}

module.exports = { pricesFromTxt }