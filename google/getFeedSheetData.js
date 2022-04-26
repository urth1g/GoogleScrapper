const { GoogleSpreadsheet } = require('google-spreadsheet');
require('dotenv').config({path: __dirname + '../.env'});

async function getFeedSheetData(){
	// Initialize the sheet - doc ID is the long id in the sheets URL
	const doc = new GoogleSpreadsheet(process.env.FEED_SHEET_ID);

	// Initialize Auth - see https://theoephraim.github.io/node-google-spreadsheet/#/getting-started/authentication
	await doc.useServiceAccountAuth({
	  // env var values are copied from service account credentials generated by google
	  // see "Authentication" section in docs for more info
	  client_email: process.env.FEED_SHEET_EMAIL,
	  private_key: process.env.FEED_SHEET_PRIVATE_KEY.replace(/\\n/g, '\n'),
	});

	await doc.loadInfo(); // loads document properties and worksheets

	const sheet = doc.sheetsByIndex[0]

	const rows = await sheet.getRows(); // can pass in { limit, offset }
    return rows;
}

module.exports = { getFeedSheetData }