function isEmptyResponse(data) {
	if (data === null) {
		return true;
	}
	if (Array.isArray(data)) {
		return data.length === 0;
	}
	for (const prop in data) {
		if (Object.prototype.hasOwnProperty.call(data, prop)) {
			// not empty
			return false;
		}
	}
	return true;
}

module.exports = isEmptyResponse;
