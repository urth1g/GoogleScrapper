const { exec } = require("child_process");


async function getCurrentHostname(){
    exec("uname -n", (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        return stdout;
    });
}

module.exports = getCurrentHostname
