const axios = require('axios');
const { getPrinters } = require('../database_getters/printers');
const cheerio = require('cheerio');
const Database = require('../db/db');

const timer = ms => new Promise(res => setTimeout(res, ms))


// let config = {
//   headers: {
// 	"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
// 	"accept-encoding": "gzip, deflate, br",
// 	"accept-language": "en-US,en;q=0.9,hr;q=0.8,de;q=0.7",
// 	"cache-control": "max-age=0",
// 	"cookie": `_ga=GA1.2.680656993.1619101099; _hjid=0b4fa19e-56ad-4c85-8e58-8e56eaec1667; s_fid=78AD385AD37DD7CC-0B4C18C3F0228DA5; cookies-allowed={"General":true,"Marketo":true,"Qualtrics":true,"GoogleAnalytics":true}; __utma=155020967.680656993.1619101099.1619116840.1619721121.2; _mkto_trk=id:946-OMQ-360&token:_mch-techdata.com-1619101106794-30621; rxVisitor=1637154812403VI3I13O6GIJA7C9DVOQRGNQCJOELO823; _gcl_au=1.1.899738080.1637154991; QSI_SI_aXdsQSZ8S3ba3xX_intercept=true; _gid=GA1.2.544254612.1637155334; _hjSessionUser_1861767=eyJpZCI6ImYxNTE4ZWViLTNiMzQtNTU0MC1iN2UwLTk0OTQ5NzZkYWY5ZCIsImNyZWF0ZWQiOjE2MzcxNTU5ODE0NDYsImV4aXN0aW5nIjp0cnVlfQ==; dtCookie=v_4_srv_10_sn_6437CE9D46475E766FA69E5887669AC2_perc_100000_ol_0_mul_1_app-3Aea7c4b59f27d43eb_1; nlbi_913313_2497096=Z7brZBpyYX6i41m3AHvFeQAAAACQdkkmrgfBpOaOr7FquuoE; nlbi_913313=8v/yEnGiqT7bcFaPAHvFeQAAAAAc1jTNe/eFzZkpzRY5KkKK; AMCV_D3FF7C0A5A20164A0A495ECB%40AdobeOrg=-1124106680%7CMCIDTS%7C18949%7CMCMID%7C25509423763880970231725178591258605769%7CMCAAMLH-1637765595%7C6%7CMCAAMB-1637765595%7CRKhpRz8krg2tLO6pguXWp5olkAcUniQYPHaMWWgdJ3xzPWQmdj0y%7CMCOPTOUT-1637167995s%7CNONE%7CvVersion%7C5.2.0; AMCVS_D3FF7C0A5A20164A0A495ECB%40AdobeOrg=1; s_tp=3789; s_cc=true; incap_ses_197_1065319=3k4ZXAT00G5tiuR3DuO7AmMXlWEAAAAAorRbSRx8hXsisRJ9cXDUug==; BIGipServerSHOP_443=2328598953.47873.0000; s_ips=2890; s_ppv=us%253Aen%253Ahomepage%2C84%2C76%2C3190%2C3%2C4; s_plt=1.41; s_pltp=us%3Aen%3Ahomepage; rxvt=1637162624472|1637160822720; dtPC=10$360822714_538h-vOTQKNCTBPPQGPMKCHTAAUKMHUUHFSSJA-0e0; dtSa=true%7CC%7C-1%7CSIGNING%20ON...%7C-%7C1637160826341%7C360822714_538%7Chttps%3A%2F%2Fsso.techdata.com%2Fas%2Fauthorization.oauth2%3Fclient_5Fid%3Dshop_5Fclient%26response_5Ftype%3Dcode%26redirect_5Furi%3Dhttps%3A%2F%2Fshop.techdata.com%2Foauth%26pfidpadapterid%3DShieldBaseAuthnAdaptor%26scope%3Dfreight_2520warranty%7C%7C%7C%7C; dtLatC=3; LiveGuide_4zIYzwGA79qVamm546-tiIsv9_date=1637162385221; LiveGuide_4zIYzwGA79qVamm546-tiIsv9_url=https%3A%2F%2Fshop.techdata.com%2Fproducts%2F12747959; LiveGuide_4zIYzwGA79qVamm546-tiIsv9_title=Shop%20With%20Tech%20Data%20%7C%20Product%20Details; LiveGuide_4zIYzwGA79qVamm546-tiIsv9_ref=; incap_ses_197_500318=pmQiSGhZj2Z/d/N3DuO7AmwllWEAAAAAHPN6fYQRx1HXFrYicfoI9A==; _hjSession_1861767=eyJpZCI6IjEwODk3ZTA0LWVjNjAtNDY5Mi1hYjQ2LTZjYWFiYTc1ZWM0NCIsImNyZWF0ZWQiOjE2MzcxNjQzOTE4MDJ9; _hjAbsoluteSessionInProgress=0; incap_ses_197_913313=TlQPEF6DHUBUfvN3DuO7Am8llWEAAAAAacCVTt3Ox7gCSc0YXUsZWg==; BannerAdSMB=true; LiveGuide_4zIYzwGA79qVamm546-tiIsv9_duration=3187733; s_sq=techdatatd-staging%3D%2526c.%2526a.%2526activitymap.%2526page%253Dus%25253Aen%25253Ahomepage%2526link%253DPrint%252520Solutions%2526region%253Dlist-03caa3956c%2526pageIDType%253D1%2526.activitymap%2526.a%2526.c%2526pid%253Dus%25253Aen%25253Ahomepage%2526pidt%253D1%2526oid%253Dhttps%25253A%25252F%25252Fwww.techdata.com%25252Fus%25252Fen%25252Fsite%25252Fproducts-list%25252Fprint-solutions.html%2526ot%253DA; QSI_HistorySession=https%3A%2F%2Fshop.techdata.com%2Fproducts%2Fcategory%2Fcategory%3Fcs%3D500001003%26refinements%3D500100301~1637160931922%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2Fcategory%2Fcategory%3Fcs%3D500001003%26refinements%3D510030102%26enav%3D500000000%26searchType%3Dproducts~1637160956707%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2Fcategory%2Fcategory%3Fcs%3D500001003%26refinements%3D500100301~1637160962163%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F13528185%2F%3FP%3D13528185%26isValuePartOnly%3DFalse~1637162373899%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F12747959~1637162384707%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F12109488~1637164392566%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F12612481~1637164416635%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F12109488~1637164428643%7Chttps%3A%2F%2Fshop.techdata.com%2FtdPartSmart~1637164831242%7Chttps%3A%2F%2Fshop.techdata.com%2F~1637165054563%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F13528185%2F%3FP%3D13528185%26isValuePartOnly%3DFalse~1637165059457%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F12079134~1637165065914%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F12612481~1637165088080%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F12109488~1637165488755%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F12612481~1637165572492%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F12079134~1637165577469%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2Fcategory%2Fcategory%3Fcs%3D500001003%26refinements%3D500100301~1637165582041%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F13111615%2F%3FP%3D13111615%26isValuePartOnly%3DFalse~1637165793241%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F12015865~1637165799653%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F13111615%2F%3FP%3D13111615%26isValuePartOnly%3DFalse~1637166089206%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2Fcategory%2Fcategory%3Fcs%3D500001003%26refinements%3D500100301~1637166092735; _gat=1; .SHOPAUTH=${SHOPAUTH}`,
// 	"sec-ch-ua": '" Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"',
// 	"sec-ch-ua-mobile": '?0',
// 	"sec-fetch-dest": 'document',
// 	'sec-fetch-mode': 'navigate',
// 	'sec-fetch-site': 'none',
// 	'sec-fetch-user': '?1',
// 	'upgrade-insecure-requests': '1',
// 	'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36'
//   }
// }

function genRand(min, max, decimalPlaces) {
    return (Math.random() * (max - min) + min).toFixed(decimalPlaces) * 1;
}

async function findToners(){
	let printers = await getPrinters();

	let baseUrl = 'https://shop.techdata.com/api/products/accessories/';
	

	printers = printers.slice(2)

	for(let i = 0; i < printers.length; i++){
		let Matnr = printers[i].Matnr;

		let { data } = await axios.get(baseUrl + Matnr, config)

		let $ = cheerio.load(data);

		let list = $("ul").find("li")

		if(list.length === 0) continue;

		let allItems = [];

		list.each((index, el) => {
			let title = $(el).find("input").data("productname")

			if(!title.includes("cartridge")) return; 

			let cost = Number($(el).find("input").data("bestprice").substr(1));
			let matnr = $(el).find("input").data("matnr");
			let printerNumber = Matnr;

			cost = Number.isNaN(cost) ? 0 : cost;

			let rating = genRand(4.5,5,1);
			allItems.push({title,cost,matnr, printerNumber, rating})
		})

		let tonersSet = new Set()

		let dict = {}

		allItems.forEach( item => {
			if(!dict[item.title]) tonersSet.add(item)

			dict[item.title] = true
		})

		let query = '';
		for (let toner of tonersSet){
			query += `INSERT INTO toner_details_final (PrinterNumber, Matnr, Name, Capacity, Cost, imgURL, ProductURL, Rating) VALUES (${toner.printerNumber}, ${toner.matnr}, '${toner.title}', 0, ${toner.cost}, '','',${toner.rating});`;
		}

		try{
			let res = await Database.getInstance().promise().query(query)
			console.log(res)
		}catch(e){
			console.log(e)
		}


		await timer(5000);
	}
}

findToners();