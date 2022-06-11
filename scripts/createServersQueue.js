const Database = require("../db/db");
const fs = require('fs');

async function run(){
    var data = fs.readFileSync('../servers.txt','utf-8')
    let str = data.toString()
    let arr = str.split("\n")


    for(let i = 0; i < arr.length; i++){

        let [id, port] = arr[i].split(" ")
        port = Number(port)
        let res = await Database.makeQuery2("INSERT INTO servers_queue (id, port, taken) VALUES(?,?,?)", [id, port, 0])
        //console.log(res)
    }
}

run();