const Database = require('../db/db');
const fs = require('fs')

class ServersQueue{
    constructor(){
    }

    async getServers(){
        let servers = await Database.makeQuery2("SELECT * FROM servers_queue WHERE taken = 0 ORDER BY port");
        return servers;
    }
}

async function run(){
    let sqo = new ServersQueue();

    let servers = await sqo.getServers()

    console.log(servers)

    let str = (port) => `
    server{
        listen [::]:${port + 1000} ssl ipv6only=on;
        listen ${port + 1000} ssl;
      
        server_name personal-server.xyz;
        location / {
          proxy_pass http://127.0.0.1:${port};
        }
      
          ssl_certificate /etc/letsencrypt/live/personal-server.xyz/fullchain.pem; # managed by Certbot
          ssl_certificate_key /etc/letsencrypt/live/personal-server.xyz/privkey.pem; # managed by Certbot
          include /etc/letsencrypt/options-ssl-nginx.conf; # managed by Certbot
          ssl_dhparam /etc/letsencrypt/ssl-dhparams.pem; # managed by Certbot
      
    }\r\n      
    `

    for(let server of servers){
        let string = str(server.port)
        fs.appendFileSync("./se.txt", string)
    }

}

run()