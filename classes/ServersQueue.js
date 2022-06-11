const Database = require('../db/db');

class ServersQueue{
    constructor(){
    }

    async getFreeServer(){
        let servers = await Database.makeQuery2("SELECT * FROM servers_queue WHERE taken = 0 ORDER BY port");

        if(servers.length === 0) throw new Error("No free servers found at the moment.")

        let { id } = servers[0]

        await Database.makeQuery2("UPDATE servers_queue SET taken = 1 WHERE id = ?", [id])

        setTimeout( () => {
                console.log('reverted back')
                Database.makeQuery2("UPDATE servers_queue SET taken = 0 WHERE id = ?", [id])
            }
            , 20000
        )
        return servers[0]
    }
}

module.exports = ServersQueue;