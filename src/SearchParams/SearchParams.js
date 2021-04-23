const dateUtils = require('../dateUtils/dateUtils.js');

const SearchParams = { stringify, parse, cleanObject };
module.exports = SearchParams;

/**
 * Convert object to search param string (parameters are alphabetized)
 * Note: there is no special handling for nested objects or arrays
 * @param {Object} object  The search param object to serialize
 * @returns {String}
 */
function stringify(object) {
	const cleaned = cleanObject(object);
	const params = new URLSearchParams(cleaned);
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
		objOrString = cleanObject(objOrString);
	}
	const params = new URLSearchParams(objOrString);
	const object = {};
	for (const [key, value] of params) {
		object[key] = value;
	}
	return object;
}

/**
 * 1) Remove properties that are functions, undefined or null
 * 1) Format Date objects into strings
 * 3) Convert true and false to "1" and "0" respectively
 * 4) Join arrays on commas
 * 5) Cast anything else to strings
 * @param {Object} object
 * @returns {Object}
 */
function cleanObject(object) {
	const cleaned = {};
	for (const prop in object) {
		// istanbul ignore next
		if (
			!object.hasOwnProperty(prop) ||
			typeof object[prop] === 'function' ||
			object[prop] === undefined ||
			object[prop] === null
		) {
			continue;
		}
		if (object[prop] instanceof Date) {
			cleaned[prop] = dateUtils.formatUtc(object[prop]);
		} else if (object[prop] === false || object[prop] === 0) {
			cleaned[prop] = '0';
		} else if (object[prop] === true) {
			cleaned[prop] = '1';
		} else if (Array.isArray(object[prop])) {
			cleaned[prop] = object[prop].join(',');
		} else {
			cleaned[prop] = String(object[prop]);
		}
	}
	return cleaned;
}
