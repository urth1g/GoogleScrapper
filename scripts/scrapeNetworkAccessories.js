const axios = require('axios')
const ServersQueue = require('../classes/ServersQueue');
const Database = require('../db/db');

async function* generateRows(){
	let count = await Database.makeQuery2("SELECT COUNT(*) as C FROM products WHERE class LIKE '%Network%'");
	let rows = count[0]['C']
	for(let i = 0; i < Math.ceil(rows / 100) * 100; i+= 100){
		yield Database.makeQuery2("SELECT * FROM products WHERE Class LIKE '%Network%' ORDER BY Matnr LIMIT 100 OFFSET " + i)
	}

	return true
}

const timer = ms => new Promise( (resolve, reject) => setTimeout(resolve, ms))

async function run(){
	const sqo = new ServersQueue()

	let multiplier = 1;
	for await( let items of generateRows() ){
		console.log(items.length)

		if(multiplier < 105){
			multiplier++
			continue;
		}
		for(let i = 0; i < 100; i++){
			console.log(i)
			console.log(100 * multiplier)
			let matnr = items[i].Matnr
		
			let server;
			let port;
			let accessPort;
			while(true){
				await timer(400)
				server = await sqo.getFreeServer();
				if(!server){
					await timer(500)
					continue;
				}

				port = server.port
				accessPort = port + 1000;
				
				if(server && port && accessPort) break;
			}

			console.log(server)
		
			let url = "https://personal-server.xyz:" + accessPort
	
			try{
				console.log('Step 1 ---- Crawling Ebay for price initiated')
				axios.post( url + '/crawl_ebay_printer', {matnr} )
				//await timer(300)
				//console.log('Step 2 ---- Crawling Amazon for price initiated')
				//await axios.post( url + '/crawl_amazon_printer', {matnr} )
				//console.log('Step 4 ---- Setting the price based on feed initiated')
				//await axios.post( url + '/crawl_for_printer', {matnr} )
			}catch(e){	
				console.log(e)
			}
		}
		multiplier++
	}
}

run()