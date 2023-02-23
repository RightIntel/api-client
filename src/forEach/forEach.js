function forEach(obj, cb) {
	if (Array.isArray(obj)) {
		obj.forEach(cb);
		return;
	}
	for (const prop in obj) {
		if (Object.prototype.hasOwnProperty.call(obj, prop)) {
			cb.call(obj, obj[prop], prop, obj);
		}
	}
}

module.exports = forEach;
