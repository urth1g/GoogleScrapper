const Database = require('../db/db');
const axios = require('axios');

async function getPrinters(){
	let printers = await Database.getInstance().promise().query(
		"SELECT * FROM products INNER JOIN images as i on products.Matnr = i.Matnr WHERE SubClass LIKE '%Laser%' OR SubClass LIKE '%Multifunction%' GROUP BY products.Matnr"
	);
	return printers;
}

async function buckets(){
	let printers = await getPrinters();

	let _printers = [];

	printers[0].forEach(x => {
		if(x.LongName.includes('laser')){
			_printers.push(x)
		}
	})

	let bucketUnder150 = [];
	let bucketOver150Under500 = [];
	let bucketOver500Under1000 = [];
	let bucketUnder1000 = [];
	let bucketOver1000Under1500 = [];
	let bucketOver1500Under2000 = [];
	let bucketOver2000Under3000 = [];
	let bucketOver3000Under4000 = [];
	let bucketOver4000Under5000 = [];
	let bucketOver5000 = [];


	_printers.forEach(x => {
		if(x.Price > 5000) bucketOver5000.push(x)
		else if (x.Price < 5000 && x.Price > 4000) bucketOver4000Under5000.push(x)
		else if (x.Price < 4000 && x.Price > 3000) bucketOver3000Under4000.push(x)
		else if (x.Price < 3000 && x.Price > 2000) bucketOver2000Under3000.push(x)
		else if (x.Price < 2000 && x.Price > 1500) bucketOver1500Under2000.push(x)
		else if (x.Price < 1500 && x.Price > 1000) bucketOver1000Under1500.push(x)
		else if (x.Price <= 1000) bucketUnder1000.push(x)
	})

	console.log('Over 5000: ', bucketOver5000.length);
	console.log('Over 4000 under 5000: ',bucketOver4000Under5000.length);
	console.log('Over 3000 under 4000: ',bucketOver3000Under4000.length);
	console.log('Over 2000 under 3000: ',bucketOver2000Under3000.length);
	console.log('Over 1500 under 2000: ', bucketOver1500Under2000.length);
	console.log('Under 1000: ', bucketUnder1000.length);

	let mapped = bucketUnder1000.map(x => x.Price);

	mapped.sort( (a,b) => a - b);

	let average = 0;

	mapped.forEach(x => {
		average += x;
	})

	console.log('Average: ', average/mapped.length)
	console.log('Median: ', mapped[Math.floor(mapped.length / 2)])

}

buckets();