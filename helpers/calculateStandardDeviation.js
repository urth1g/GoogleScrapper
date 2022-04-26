function calculateStandardDeviation(arr){
    if(arr.length < 2) return 0;

    let mean = 0;

    arr.forEach(x => {
        mean += x
    })

    mean = Math.round(mean / arr.length);

    let sumOfSquares = 0;

    arr.forEach(x => {
        sumOfSquares += Math.pow(Math.round(x - mean), 2);
    })

    let deviation = Math.sqrt(sumOfSquares / arr.length);
    return deviation;
}

module.exports = { calculateStandardDeviation }