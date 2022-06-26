const Database = require('../db/db');

class ServersQueue{
    constructor(){
    }

    async getFreeServer(){
        //let servers = await Database.makeQuery2("SELECT * FROM servers_queue WHERE taken = 0 ORDER BY port");

        let servers = await Database.makeQuery2("SELECT * FROM servers_queue WHERE taken = 0")

        if(servers.length === 0) return undefined

        let { id } = servers[0]

        let data = await Database.makeQuery2("UPDATE servers_queue SET taken = 1 WHERE id = ?", [id])
        return servers[0]
    }
}

module.exports = ServersQueue;