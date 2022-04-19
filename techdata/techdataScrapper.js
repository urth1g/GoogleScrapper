const search = require('../helpers/search');
const subsets = require('../helpers/subsets');
const tsfc = require('../helpers/transformStringForComparison');
const axios = require('axios');
const Database = require('../db/db');
const cheerio = require('cheerio');
const { compareDocumentPosition } = require('domutils');
const fs = require('fs');

const timer = ms => new Promise(res => setTimeout(res, ms))


let techDataUrlConfig = {
  headers: {
	"accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9",
	"accept-encoding": "gzip, deflate, br",
	"accept-language": "en-US,en;q=0.9,hr;q=0.8,de;q=0.7",
	"cache-control": "max-age=0",
	"cookie": '_ga=GA1.2.680656993.1619101099; _hjid=0b4fa19e-56ad-4c85-8e58-8e56eaec1667; s_fid=78AD385AD37DD7CC-0B4C18C3F0228DA5; cookies-allowed={"General":true,"Marketo":true,"Qualtrics":true,"GoogleAnalytics":true}; __utma=155020967.680656993.1619101099.1619116840.1619721121.2; _mkto_trk=id:946-OMQ-360&token:_mch-techdata.com-1619101106794-30621; rxVisitor=1637154812403VI3I13O6GIJA7C9DVOQRGNQCJOELO823; _gcl_au=1.1.899738080.1637154991; QSI_SI_aXdsQSZ8S3ba3xX_intercept=true; _gid=GA1.2.544254612.1637155334; _hjSessionUser_1861767=eyJpZCI6ImYxNTE4ZWViLTNiMzQtNTU0MC1iN2UwLTk0OTQ5NzZkYWY5ZCIsImNyZWF0ZWQiOjE2MzcxNTU5ODE0NDYsImV4aXN0aW5nIjp0cnVlfQ==; dtCookie=v_4_srv_10_sn_6437CE9D46475E766FA69E5887669AC2_perc_100000_ol_0_mul_1_app-3Aea7c4b59f27d43eb_1; nlbi_913313_2497096=Z7brZBpyYX6i41m3AHvFeQAAAACQdkkmrgfBpOaOr7FquuoE; nlbi_913313=8v/yEnGiqT7bcFaPAHvFeQAAAAAc1jTNe/eFzZkpzRY5KkKK; AMCV_D3FF7C0A5A20164A0A495ECB%40AdobeOrg=-1124106680%7CMCIDTS%7C18949%7CMCMID%7C25509423763880970231725178591258605769%7CMCAAMLH-1637765595%7C6%7CMCAAMB-1637765595%7CRKhpRz8krg2tLO6pguXWp5olkAcUniQYPHaMWWgdJ3xzPWQmdj0y%7CMCOPTOUT-1637167995s%7CNONE%7CvVersion%7C5.2.0; AMCVS_D3FF7C0A5A20164A0A495ECB%40AdobeOrg=1; s_tp=3789; s_cc=true; incap_ses_197_1065319=3k4ZXAT00G5tiuR3DuO7AmMXlWEAAAAAorRbSRx8hXsisRJ9cXDUug==; BIGipServerSHOP_443=2328598953.47873.0000; s_ips=2890; s_ppv=us%253Aen%253Ahomepage%2C84%2C76%2C3190%2C3%2C4; s_plt=1.41; s_pltp=us%3Aen%3Ahomepage; rxvt=1637162624472|1637160822720; dtPC=10$360822714_538h-vOTQKNCTBPPQGPMKCHTAAUKMHUUHFSSJA-0e0; dtSa=true%7CC%7C-1%7CSIGNING%20ON...%7C-%7C1637160826341%7C360822714_538%7Chttps%3A%2F%2Fsso.techdata.com%2Fas%2Fauthorization.oauth2%3Fclient_5Fid%3Dshop_5Fclient%26response_5Ftype%3Dcode%26redirect_5Furi%3Dhttps%3A%2F%2Fshop.techdata.com%2Foauth%26pfidpadapterid%3DShieldBaseAuthnAdaptor%26scope%3Dfreight_2520warranty%7C%7C%7C%7C; dtLatC=3; LiveGuide_4zIYzwGA79qVamm546-tiIsv9_date=1637162385221; LiveGuide_4zIYzwGA79qVamm546-tiIsv9_url=https%3A%2F%2Fshop.techdata.com%2Fproducts%2F12747959; LiveGuide_4zIYzwGA79qVamm546-tiIsv9_title=Shop%20With%20Tech%20Data%20%7C%20Product%20Details; LiveGuide_4zIYzwGA79qVamm546-tiIsv9_ref=; incap_ses_197_500318=pmQiSGhZj2Z/d/N3DuO7AmwllWEAAAAAHPN6fYQRx1HXFrYicfoI9A==; _hjSession_1861767=eyJpZCI6IjEwODk3ZTA0LWVjNjAtNDY5Mi1hYjQ2LTZjYWFiYTc1ZWM0NCIsImNyZWF0ZWQiOjE2MzcxNjQzOTE4MDJ9; _hjAbsoluteSessionInProgress=0; incap_ses_197_913313=TlQPEF6DHUBUfvN3DuO7Am8llWEAAAAAacCVTt3Ox7gCSc0YXUsZWg==; BannerAdSMB=true; LiveGuide_4zIYzwGA79qVamm546-tiIsv9_duration=3187733; s_sq=techdatatd-staging%3D%2526c.%2526a.%2526activitymap.%2526page%253Dus%25253Aen%25253Ahomepage%2526link%253DPrint%252520Solutions%2526region%253Dlist-03caa3956c%2526pageIDType%253D1%2526.activitymap%2526.a%2526.c%2526pid%253Dus%25253Aen%25253Ahomepage%2526pidt%253D1%2526oid%253Dhttps%25253A%25252F%25252Fwww.techdata.com%25252Fus%25252Fen%25252Fsite%25252Fproducts-list%25252Fprint-solutions.html%2526ot%253DA; QSI_HistorySession=https%3A%2F%2Fshop.techdata.com%2Fproducts%2Fcategory%2Fcategory%3Fcs%3D500001003%26refinements%3D500100301~1637160931922%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2Fcategory%2Fcategory%3Fcs%3D500001003%26refinements%3D510030102%26enav%3D500000000%26searchType%3Dproducts~1637160956707%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2Fcategory%2Fcategory%3Fcs%3D500001003%26refinements%3D500100301~1637160962163%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F13528185%2F%3FP%3D13528185%26isValuePartOnly%3DFalse~1637162373899%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F12747959~1637162384707%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F12109488~1637164392566%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F12612481~1637164416635%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F12109488~1637164428643%7Chttps%3A%2F%2Fshop.techdata.com%2FtdPartSmart~1637164831242%7Chttps%3A%2F%2Fshop.techdata.com%2F~1637165054563%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F13528185%2F%3FP%3D13528185%26isValuePartOnly%3DFalse~1637165059457%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F12079134~1637165065914%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F12612481~1637165088080%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F12109488~1637165488755%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F12612481~1637165572492%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F12079134~1637165577469%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2Fcategory%2Fcategory%3Fcs%3D500001003%26refinements%3D500100301~1637165582041%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F13111615%2F%3FP%3D13111615%26isValuePartOnly%3DFalse~1637165793241%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F12015865~1637165799653%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2F13111615%2F%3FP%3D13111615%26isValuePartOnly%3DFalse~1637166089206%7Chttps%3A%2F%2Fshop.techdata.com%2Fproducts%2Fcategory%2Fcategory%3Fcs%3D500001003%26refinements%3D500100301~1637166092735; _gat=1; .SHOPAUTH=0E4D8718089622504FF92B2835D962D7FF5D932E3B1D55DEF89BD54DC1807CB6093601E5CA71F50DD60D7568BDEDA19C5145AF70EC283D72C9379B206E583A143424DFFC503C37E7C0EE20D81745C2E07E3E5C309D83992024AC5C5E8A38205183CBD362631BF30BBAD7994D838C9E4A2B8657FB97406B930E0AE831BA1537703BC6EF6F0FFD5CB53DE0CAB7B0C73ADA40E653E53FCBBF407AE8C298C25C7C7D18CC294E4095FB17017D65F4278595E5584C7549CFB0F90B53A9A58440C4E977C44580B54F7A17311520B0FC50770ECB8C6CDE98F7829169703C23055898B58121E6341908EFFA13352B5662B668BB96E87863049EDC55A320EF0C2E29FB63E42367458C3D92C08DE135E5424ECFE9D94D3B917B152E0CAF57954473D7ABBCAFDB7E55F7E447D847C1D59D74BE187A8358142D3F332F1C53A6D37F4626CD4E77C296A85F0B32763A6B42F910245EB8A99E4BACFB9794F8CD0D3A46B64C64A822916BAE9977F76A032BB241728456AB08B20E576CE8FD4E68CB0E22A7B70DD3B4747AE0FEE9CF24C0B093EBEF7B09804240798D78B03FD6936DE929DD377A3835C11AC5D2117BE105267863225E1676FF896CD2B47F22D9D95699910D76CDF7B24D576C67E7E6295B52712B4CAE3435ECA3AA941BA12E93A610AC542E434A58808B92FF256CFBB4F2599478BAFD84A8B3394F5CAFC06CBF46B35384ADCB72917325E15034625A3E287C50F371F38CB405EAB7E5A1466C048A71603ECB8B3B9C39EA66A38458AAE720650CDAF61484BB99ADBAAF5C671536ABBDEAE5C15B2A7909B743AC7099327D3DB1285A1A8108ED34B18A925E3F4AA58E896074F6670E85EC88E5EAFF1E9CAE71178306B073467DA62886B373A02B30712AD3674C8A759F994A4BFDCF3352CC748D57158A9844D761E770E06A68FE0AE0D126B2A8E30CE81B0210520FF12FCB94B9F297321F4A480E0F6A5F5D5EADE8F0CA7234B43469CAC4F72D9AC64D140202F60CE2BC2757A06F876C8FA225DB9B0AECAE9C563A3773A1F8A8655C230B817A685AC067C2EED755D8A8C5F47DBCE4483028036052DF4D14EFEA0321C0A080082969AFE382A60E41CCF176C04FE8BEC6C824ED72AFB9C33B580900BDFCE1E4BC1D45709865A1C87E3F2FA6511B1B3C903FEDB9C4BF9F5FC943C3A393002C4FA1C16D5B0D61F486F13CE22E5B4A58CCB2828648F42F64E85656DC72E38024BEAFC8B1FAFFB45963CE1C1CBFDBCE6A5F91368CF71ABD8AEC875BB9E7930FC00B4DDB2D558B5F0AA91D9B7AE9F5E2CB02FFCA0F0CAFD8F7254B1AD606DD2932202CF067318AE6CA054A22DD07BFF52BE907A0CD72D808CC9626C0CBAD8B6AA27C248A1D2BED7E9D2C861AD544B253FAE36EF3A1A5E7303662B72995E2B2B95DBD7ECFFB2C09B2AC79FDC80A99D878B3D2EDE55D23917BB449F964A2C4A3DB3D8A375FE6F87EB0F2FAB0BBB504C2A2398899E16B66FE614FC90808A68D0F548A53953601233FBE6305FF2F88E7B08FDFBAC98989C3A69981764E5A3C2D672318D1F08C594E31123031F9CE6D0BC8D5A7147A64B9ADB900C2F09EE26A0A899B216882B5C1B9FED0DE48E43FD5417FDBAF8E7AB09CA40B80230BA01FC67584B94458D258546A18260633806008F012B7DC5B444079065669B7C326CC548A853C7992C1D716CF04038ACAACF558235AE42EB05E100DD25B62F21B70E7DC64D094969BCE01AE846F0EA01B685A3B260454B3ED0DB4DE0721418ACD2B6814E760C723A32C293877DDCE646DB09638314C3CDCAC4FB6ADBBD6986CBB713442D84AAAF3927834D84E0B9FE43B62BAC448A51580BDDA804D132AA649B5390486FB6DB724F4F004AC46ED2D671EDD1699D8738D2FFEDAE8B07A3A0980FD4F9FDDFFAE4241FAE3DFFF5BF697425BBDFDAC681473661DC78232448D7F3D58CFF21BAE2C0C2D778F26495ABBDCA3718933CB97F3C0CBFFF93559B6BCCB3B4E275A188D35DDF5C63E18903573C2CB36C8E19BAF8905C984B9997FD36323490A2413C7F7171C70C2370D00BF12B8EE38B38A7ED0AE4BBB91320F1A1323F47B68E67914031F6EC1F8239790D5C3AE0B162C9D71996EC7AC24587DD3B1F93D3709F04CBCE9A74F968E94AD016A2B59C1561969B8F9971031FDFB94E3A748B4682901114BB512E56596D1F6CE2B6EDE768EC6AD8D0F0BB9EA897E2D97FA778E4D3059791C5758D0DDAF23ECDB3D9C824267B264D03D8511E6454FDEBFF791B56B52411F27F51350EDF4F570193390ED4DC4041833BDC874DFCD0666D9AF4094D9CF811D8187F7CFB983C25BC12FA0B2B2D86F6C226A4995E9CA8C752459C314E0138F5CC6B5B5B8251492100671FF3DF265A5E6C3F4FBC242B02786E3A9F96A74D5D6E9F564B297C19AAB74DF6E724CAB69F8874ED8778B2B9497C8E901E6A595B4EA19A08AD28FA5167C10BE91C951EECE9E1917330845A75E304E8F2861E175CAADDCCF7F90934D85B454A721657515B120E110ADD721AF868C30FC4513BACC977127CE9F1EB6F70B43570761775BBD364323CF312BEBA0DD9464D0DE3AF8448DF7410A3AD09FE9AE23373C2BC3BC7E01DBCF90EB28DFA796860303C56C41336FF4AC4C6FD5217CBD2C9B5AA35DD1BBA86E7768734DC3DC4E5E6B21B3D744306EFA47C74FA5A6EC768CB9597C36EECB61701D8A361E44005F5E6F3B49BE9D8817AA536E398796E8C3B4FE2E841E8D546FE1CBC7D026555F4604EF3060125926866FAEDC5C72',
	"sec-ch-ua": '" Not A;Brand";v="99", "Chromium";v="90", "Google Chrome";v="90"',
	"sec-ch-ua-mobile": '?0',
	"sec-fetch-dest": 'document',
	'sec-fetch-mode': 'navigate',
	'sec-fetch-site': 'none',
	'sec-fetch-user': '?1',
	'upgrade-insecure-requests': '1',
	'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/90.0.4430.93 Safari/537.36'
  }
}

function grabLinks(){
	let baseUrl = "https://shop.techdata.com/products/category/category?cs=500001003&refinements=500100301&market=USA&psz=100"

	return new Promise( (resolve, reject) => {
		axios.get(baseUrl, techDataUrlConfig).then( res => {
			const $ = cheerio.load(res.data);

			let urls = []
			$(".subFiltersMultiselect > ul > li > .searchrefine").each(function(){
				let filt = $(this).data("filt");
				let title = $(this).attr("title");

				let url = baseUrl.replace(/refinements=(\d+)/g, "refinements="+filt)

				urls.push({
					url, title
				})
			})

			resolve(urls);
		}).catch(err => console.log(err))
	});
}

async function getPages(url){

	let res = await axios.get(url, techDataUrlConfig).then( res => {
		const $ = cheerio.load(res.data);

		let pages = $(".productCount").text().match(/(\d+)/g)[1];

		return pages;
	})

	return res;
}

async function searchTechdata(){
		let urlObjects = await grabLinks()

		for(let i = 0; i < urlObjects.length; i++){
			await timer(5000)
			let pages = await getPages(urlObjects[i].url)

			await goThroughPage(urlObjects[i].url, pages);
		}
		return;

}

async function updateDatabase(elements){

	return new Promise((resolve, reject) => {
		elements.forEach(x => {

			if(x.price[0] === ''){
				x.price.pop();
			}else{
				x.price[0] = parseFloat(x.price[0])
			}

			let _prices = x.price;
			let matnr = x.matnr;

			Database.getInstance().query("INSERT INTO inventory (Matnr, Techdata) VALUES (?,?)", [matnr, JSON.stringify(_prices)], (err, result) => {
				if(err) {
					if(err.errno === 1062){
						Database.getInstance().query("UPDATE inventory SET Techdata = ? WHERE Matnr = ?", [JSON.stringify(_prices), matnr], (err, result) => {
							if(err) console.log(err);

							resolve(result)
						})
					}
				}

				resolve(result)
			})
		})
	})
}
async function goThroughPage(url, pages){
	for(let i = 1; i <= pages; i++){
		await timer(1000)
		console.log(i);

		let elements = [];

		let { data } = await axios.get(url + "&page=" + i, techDataUrlConfig);

		console.log(url + "&page=" + i)

		const $ = cheerio.load(data);

		let shortNames = $(".productDetailsLink")
		let longNames = $(".productDesci");
		let priceMSRP = $(".pricing-MSRP > span");
		let promoPrice = $(".pricing-Display > span");
		let thumbnails = $(".js-thumbnailUrl");
		let matNrs = $(".isFavorite");


		let _shortNames = [];
		let _longNames = []; 
		let _prices = [];
		let _images = []; 
		let _matNrs = [];

		await shortNames.map(function(i,el){
			let name = $(this).text()
			let longName = $(longNames[i]).text();
			let _priceMSRP = $(priceMSRP[i]).text().trim();
			let _promoPrice = $(promoPrice[i]).text().trim();
			let _img = $(thumbnails[i]).attr("src");
			let _matNr = $(matNrs[i]).data("matnr");

			let price = 0; 

			if(!_promoPrice.startsWith("$")){
				price = 0
			}else{
				price = _promoPrice.split("$")[1]
			}

			let obj = {};
			obj['name'] = name;
			obj['longName'] = longName
			obj['price'] = [tsfc(price)];
			obj['img'] = _img;
			obj['matnr'] = _matNr;

			elements.push(obj)
		});

		//elements.push({ shortNames: _shortNames, longNames: _longNames, prices: _prices, images: _images, matNrs: _matNrs });

		updateDatabase(elements);
	}
}

async function getTokenFromDB(){
	let result = await Database.makeQuery2("SELECT value FROM configuration WHERE action = 'techdata_token'");

	let token = result[0];

	return token;
}

async function getTechdataPrice(matnr){

	let token = await getTokenFromDB();

	let res4 = await axios.get(`https://shop.techdata.com/products/${matnr}/?P=${matnr}`, {headers:{
		'Cookie': token.value,
		'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36',
	}})

	let $ = cheerio.load(res4.data)

	let price = $(".pricing-Display").text().trim();

	console.log(price)
	return price.startsWith("$") ? Number(price.substr(1).replace(/\,/g, "")) : 0;
}

async function getTechdataAvailability(matnr, price){

	let token = await getTokenFromDB();

	console.log(`https://shop.techdata.com/api/products/availability/?id=${matnr}&price=$${price}`)
	let res4 = await axios.get(`https://shop.techdata.com/api/products/availability/?id=${matnr}&price=$${price}`, {headers:{
		'Cookie': token.value,
		'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/100.0.4896.88 Safari/537.36',
	}})

	let $ = cheerio.load(res4.data)

	return res4.data.availability.plantAvailability
}

async function getShippingPrice(matnr){
	let result = await Database.makeQuery2("SELECT * FROM inventory_log WHERE Matnr = ?", [matnr]);

	let { Link } = result[0]

	if(!Link) return 12.56

	console.log("https://www.google.com" + Link)
	let responseGoogle = await axios.get("https://www.google.com" + Link + "&sfr=compass&ei=DWTdYeK_G7qHytMPm7yLsAU&tbs=new%3A1")

	let regexToExtractShipping = /aria\-label\=\"Information on how the total price is calculated\".+?Shipping<\/td><td((?:(?!td).)+)?\>\$([^|]+?)\</g

	let arr = [...responseGoogle.data.matchAll(regexToExtractShipping)]

	let minShipping = Number.MAX_SAFE_INTEGER;

	for(let match of arr){
		let price = parseFloat(match[2])

		console.log(price)
		if(price < 6) continue

		minShipping = Math.min(price, minShipping)
	}

	return Math.min(0, minShipping)
}

async function setTechdataPrice(matnr){
	let shipping = await getShippingPrice(matnr)
	let price = await getTechdataPrice(matnr);

	//console.log(price, shipping);

	if(price == 0) {
		await Database.makeQuery2("UPDATE inventory SET Techdata = ? WHERE Matnr = ?", ['[]', matnr])
		return []
	}

	let availability = await getTechdataAvailability(matnr, price)
	let state = 'New';

	let curDate = Math.round(new Date().getTime() / 1000) ;

	availability = availability.map(x => {

		let futureDate = Math.round(new Date(x.estimatedAvailableDate).getTime() / 1000)

		let days = Math.round( (futureDate - curDate) / (3600 * 24) )

		return {
			...x,
			newBatchIn: (futureDate === 0 || Number.isNaN(futureDate)) ? 999 : days
		}
	})
	let combinedObject = { price: Math.round(Number(price) + Number(shipping)), availability, state }

	let arr = [combinedObject];

	try{
		await Database.makeQuery2("UPDATE inventory SET Techdata = ? WHERE Matnr = ?", [JSON.stringify(arr), matnr])
		return arr;
	}catch(e){
		throw new Error(e)
	}
}

module.exports = { searchTechdata, setTechdataPrice }