const getCurrentHostname = require('../shell/getCurrentHostname');

async function freeServer(){
	let id = await getCurrentHostname()

	let resp = await Database.makeQuery2("UPDATE servers_queue SET taken = 0 WHERE id LIKE ?", ['%' + id + '%'])
	
	console.log(resp)
	console.log(id)
}

module.exports = freeServer