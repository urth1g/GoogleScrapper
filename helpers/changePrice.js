const randomIntFromInterval = require('./randomNum.js')

function changePrice(price){
	if(price >= 1000){
		return +(price - randomIntFromInterval(1, 2)).toFixed(2);
	}else if(price < 1000 && price >= 750){
		return +(price - randomIntFromInterval(1,2)).toFixed(2);
	}else if(price < 750 && price >= 500){
		return +(price - randomIntFromInterval(1,2)).toFixed(2);
	}else if(price < 500 && price >= 300){
		return +(price - randomIntFromInterval(1,2)).toFixed(2);
	}else if(price < 300 && price >= 50){
		return +(price - randomIntFromInterval(1,2)).toFixed(2);
	}else if(price < 50){
		return +(price - randomIntFromInterval(1, 2)).toFixed(2);
	}
}

module.exports = changePrice