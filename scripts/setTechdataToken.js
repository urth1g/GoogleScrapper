const Database = require('../db/db');
const cheerio = require('cheerio');
const axios = require('axios');

async function setTechdataToken(){
	let url = 'https://sso.techdata.com/as/authorization.oauth2?client_id=shop_client&response_type=code&redirect_uri=https://shop.techdata.com/oauth&pfidpadapterid=ShieldBaseAuthnAdaptor&scope=freight%20warranty';

	let res = await axios({
		method: 'get',
		url: url
	})

	let cookies = res.headers['set-cookie'];

	let str = ""

	cookies.forEach(x => {
		x = x.split(";")[0]
		str += x
		str += "; "
	})

	let $ = cheerio.load(res.data)
	let formAction = $("form").attr("action");

	try{
		let res2 = await axios({
			method: 'POST',
			headers: { 
				'Content-Type': 'application/x-www-form-urlencoded',
				'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36',
				'Cookie': str
			},	
			url: "https://sso.techdata.com" + formAction,
			data: 'pf.username=641776&pf.pass=Harrison2022%2B&pf.passwordreset=&pf.ok=clicked&pf.cancel=&pf.adapterId=GlobalIONAuthnAdapter',
			withCredentials: true,
			maxRedirects: 0
		})
	}catch(e){
//		PF = e.response.headers['set-cookie'][1]
		
		let location = e.response.headers['location']
		console.log(str)
		console.log(location)
		// let match = PF.match(/PF=(.+?)\;/)


		// if(match) PF = match[1]
		// else throw new Error("PF value undefined")

		let str2 = ""

		e.response.headers['set-cookie'].forEach(x => {
			x = x.split(";")[0]
			str2 += x
			str2 += "; "
		})

		let code = location.split("=")[1]

		let shopauth = null;

		try{
			let res3 = await axios({
				method: 'GET',
				headers: {
					'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36',
					'authority': 'shop.techdata.com',
					'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9'
				},	
				url: location,
				withCredentials: true,
				maxRedirects: 0
			})

			let cookie = res3.response.headers['set-cookie'][1]

		}catch(err){
			console.log(err.response)			
			shopauth = err.response.headers['set-cookie'][0].split(";")[0]
		}

		if(shopauth){
			await Database.makeQuery2("UPDATE configuration SET value = ? WHERE action = 'techdata_token'", [shopauth])
			return shopauth;
		}else{
			return null
		}
	}
}

async function run(){
	let token = await setTechdataToken()

	console.log(token)
}

run();