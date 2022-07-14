var checkWord = require('check-if-word'),
    words     = checkWord('en');
const fs = require('fs');

try {
    const data = fs.readFileSync('./models.txt', 'utf8');

    let arr = data.split("\r\n")

    for(let item of arr){
        let strToCheck = item.split(" - ")[0]

        if(!strToCheck) continue;
        let detectLang = words.check(strToCheck)

        if(detectLang){
            console.log(strToCheck)
            console.log(detectLang)
        }
    }
} catch (err) {
    console.error(err);
}