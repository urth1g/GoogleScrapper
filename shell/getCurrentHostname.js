const { exec } = require("child_process");


function getCurrentHostname(){

    return new Promise( (resolve, reject) => {
        exec("uname -n", (error, stdout, stderr) => {
            if (error) {
                console.log(`error: ${error.message}`);
                return;
            }
            if (stderr) {
                console.log(`stderr: ${stderr}`);
                return;
            }
            resolve(stdout.trim());
        });
    })
}

module.exports = getCurrentHostname
