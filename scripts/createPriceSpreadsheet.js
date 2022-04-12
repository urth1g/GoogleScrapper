const { GoogleSpreadsheet } = require('google-spreadsheet');
const Database = require('../db/db');
const axios = require('axios');

const timer = ms => new Promise(res => setTimeout(res, ms))

async function getPrinters(){
	let printers = await Database.getInstance().promise().query(
		"SELECT * FROM products INNER JOIN images as i on products.Matnr = i.Matnr WHERE SubClass LIKE '%Laser%' OR SubClass LIKE '%Multifunction%' GROUP BY products.Matnr"
	);
	return printers;
}

async function insertData(){
	let sheetId = '1csM52d2CgSDXTm3tDRbxjjDgr2XEp1LhrlC5B6Npbl0';

	let apiKey = 'AIzaSyAv7J-L9426IEO3rPVHT556Orm_q1sd8Gk'

	// Initialize the sheet - doc ID is the long id in the sheets URL
	const doc = new GoogleSpreadsheet(sheetId);

	// Initialize Auth - see https://theoephraim.github.io/node-google-spreadsheet/#/getting-started/authentication
	await doc.useServiceAccountAuth({
	  // env var values are copied from service account credentials generated by google
	  // see "Authentication" section in docs for more info
	  client_email: 'amo-743@sheets-api-337210.iam.gserviceaccount.com',
	  private_key: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQCdbl1wSsi6wVg8\nKvXwrsXa3bs6ej17DderayO9PWIErhAL/S8PzzwiZ+pG6t0kmlZs/mjDqf3dHFyC\nN2m52H77ekMV+XnGNSwmb4cCFsqKADIlJ2WfNa0Ap5gVtRS0yb8yRrbKG2xMDKiI\nrLcPzvoI6F0WSvWaznuLuuLQEwgNnFqYlby3oElDPi0F5BTl2jD71ZDO30mN3Puh\np+zOVCNMHExd0jYaoAiUIaNpmbKX9P4W25S9Joob0TjvqNsNODcvMy+U/ixwltop\nSn6sZSulstwR0+67Uz+l7L2O+XWR3Pd4N/Camt6P4NrmH5lP8KC7LPmHNLZQA7MO\n/jPHViT3AgMBAAECggEAEUsRSod8ez9H0PwrHfAk3cDjky3gWQcRPMw9FcmLXdY8\n/wQlykfKZEEj8/xSpHWrrrdXjL68mzBFXSx3GaoVcMxiWCSaYtJuch5oJyuXvgb9\neyVTvWRpB5xhUWkdyCotLXmlFJhkkgoF7VWDmmHzB013BD7hscqiuZui1JZymQP6\nuEOXrQpFq80WSBDNBvpETNalnIc/s88uauh6KP2xzPtRocaiUCvYn7j270Rkytgj\nPVr8Q63yuJ1gEqgLNFwlY9erA3uQpTC0EqpehPj14jDiabG+Xl2IeEzUpvMe6gN4\naJa9J//5uBrLYqtFXbWS7Ks/0Tmf5hwkxR/OpYxpKQKBgQDKvGHyl4gdpTiDHMq0\nvd3WLQGnVMXk8D/6nE4EipClcP3kiN5Yz81G0vTCcqgLJ4q8FOEVmxVBn0j4FrHr\nZaUQaWgSRvzRCnWSSN0uWhK9mgU4LfDGTmPrIOGNFPI4x/DEMJWekP61J+OPOm7s\nTN7Bv2ZI5dOQOGdrdl56Jca7kwKBgQDGyt+Mgxi/5uTo2OFvhrVduFr9ht7RErfY\nFmyJ3tkerAhM+vUR//Z3hQWGhqr1KnhWOV+uA4N0In1Y67yD5FXRiNc1zO+JYyqE\nYzPpnFeFJ5Dixq/FUIaKC0834Y2N5cC6+gARJh/1fCtmbmVknI0Qy4zHulPGDYKA\nqUgBakL3jQKBgQDEbnCMx6uX5bzytJPnOcvWN/dRNP8lSm8DGC0zkzqBQhCOPNsK\nvBUOWVnTiZoubJqsj6Ji98dJtNbTodGz3eFoHGk8xFEzDepK2ZSM07MyyCfkfga7\nbbq8WDiSJMhoobkzrktZvu07gzGmVhyhkf2HRjcJzL0HEM+LvL3fpfh/RwKBgEPN\nlFvnpvxlM3Rb7OBOMPQLWjWY18y1trDkTRblRGbaxGYFPqtqA1WWsGDG8+51EuBN\n512B40csMFaw6PaPXdn+83BtOtJAWZMYBu/KHGvVJ+zBWdhR8+GHo/hqXQ6l64ua\nk4VF3KatOFxSkRC0+MReuOCyo7osh3N8yYt6A+dNAoGBALY/6u8ExcYAIe9AERM3\n3lJzP3Y/k1BGKNJYwiJK9AaDQTCGMfwzgTd+8lIG44P1NZw+eIWhbn/zrDORaR8R\ntrsekLJxFjFqwEBAn1agaYSh/30o+zn2PnaxWTKnj2abyWJwcROhr7XLuty1d5kt\n7OYgDxYNlc5WV4ThMsDKlI4k\n-----END PRIVATE KEY-----\n',
	});

	await doc.loadInfo(); // loads document properties and worksheets

	const sheet = doc.sheetsByIndex[0]

	const rows = [];

	let printers = await getPrinters();


	let _printers = [];

	printers[0].forEach(x => {
		if(x.LongName.includes('laser')){
			_printers.push(x)
		}
	})

	_printers.forEach(x => {
		let title = x.ShortName.split(' - ')[0];
		let mpn = x.mpn;
		let price = x.Price + ' USD';
		let id = x.id;
		let link = `https://amofax.com/item/${x.Matnr}`;
		let description = x.LongName;
		let gtin = x.gtin;
		let image_link = x.url;
		let availability = "in_stock";

		rows.push({
			title,
			mpn,
			price,
			id,
			link,
			description,
			gtin,
			image_link,
			availability
		})
	})

	console.log(rows)
	try{
		const moreRows = await sheet.addRows(rows);
	}catch(e){
		console.log(e.data.error)
	}

}

insertData();