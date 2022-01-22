function generateSubsets(arr){

  return new Promise((resolve, reject) => {
	  let _arr = [];

	  for(let i = 0; i < arr.length; i++){
	    for(let j = i+1; j < arr.length + 1; j++){
	      let str = arr.slice(i,j).join("")
	      _arr.push(str)
	    }
	  }

	  resolve(_arr)
  })
}

function generateSubsetsv2(str){

	return new Promise( (resolve, reject) => {
		resolve(str.split(" "));
	});
}

let exportObj = {
	v1: generateSubsets,
	v2: generateSubsetsv2
}

module.exports = exportObj;