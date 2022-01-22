function tsfc(s){
	if(!s) return ''
	return s.toLowerCase().replace(/\,|\s|\-|\(|\)/g, "")
}

module.exports = tsfc;