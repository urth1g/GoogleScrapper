function tsfc(s){
	if(s === 0) return '';
	if(!s) return '';
	return s.toLowerCase().replace(/\,|\s|\-|\(|\)/g, "")
}

module.exports = tsfc;