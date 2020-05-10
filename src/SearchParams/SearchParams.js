const SearchParams = { stringify, parse };
module.exports = SearchParams;

/**
 * Convert object to search param string (parameters are alphabetized)
 * Note: there is no special handling for nested objects or arrays
 * @param {Object} object  The search param object to serialize
 * @returns {String}
 */
function stringify(object) {
	const cleanObject = _cleanObject(object);
	const params = new URLSearchParams(cleanObject);
	params.sort();
	return params.toString().replace(/\+/g, '%20').replace(/%2C/gi, ',');
}

/**
 * Convert a search param string into an object
 * Note: duplicate params such as "a=1&a=2" or "a[]=1&a[]=2" don't work
 * @param {String|Object} objOrString  The search param string to deserialize
 * @returns {Object}
 */
function parse(objOrString) {
	if (
		typeof objOrString === 'object' &&
		!(objOrString instanceof URLSearchParams)
	) {
		objOrString = _cleanObject(objOrString);
	}
	const params = new URLSearchParams(objOrString);
	const object = {};
	for (const [key, value] of params) {
		object[key] = value;
	}
	return object;
}

/**
 * 1) Remove properties that are undefined and null
 * 2) Convert true and false to "1" and "0" respectively
 * 3) Join arrays on commas
 * 4) Cast to strings
 * @param {Object} object
 * @returns {Object}
 * @private
 */
function _cleanObject(object) {
	const cleanObject = {};
	for (const prop in object) {
		if (!object.hasOwnProperty(prop)) {
			continue;
		}
		if (object[prop] === false || object[prop] === 0) {
			cleanObject[prop] = '0';
		} else if (object[prop] === true) {
			cleanObject[prop] = '1';
		} else if (Array.isArray(object[prop])) {
			cleanObject[prop] = object[prop].join(',');
		} else if (object[prop]) {
			cleanObject[prop] = String(object[prop]);
		}
	}
	return cleanObject;
}
