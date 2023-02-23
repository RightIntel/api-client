function getObjectSize(obj) {
	let count = 0;
	for (const prop in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, prop)) {
			count++;
		}
	}
	return count;
}

module.exports = getObjectSize;
