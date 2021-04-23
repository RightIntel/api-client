function parse(value, defaultIfError = undefined) {
	try {
		return JSON.parse(value);
	} catch (e) {
		return defaultIfError;
	}
}

function stringify(value, defaultIfError = undefined) {
	try {
		return JSON.stringify(value);
	} catch (e) {
		return defaultIfError;
	}
}

const tryJson = {
	parse,
	stringify,
};

module.exports = tryJson;
