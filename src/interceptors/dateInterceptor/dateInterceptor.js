const moment = require('moment');
require('moment-parseplus');
const forEach = require('lodash/forEach');
const offsetMinutes = new Date().getTimezoneOffset();

const dateInterceptor = {
	request,
	response,
	isDateField,
	isDateFormat,
	toUtc,
	fromUtc,
	mapToUtc,
	mapFromUtc,
};

module.exports = dateInterceptor;

// Transform all requests and responses
// to convert date values to and from UTC time
function request({ request }) {
	if (request.searchParams) {
		mapToUtc(request.searchParams);
	}
	if (request.json) {
		mapToUtc(request.json);
	}
}
function response({ response }) {
	mapFromUtc(response.data);
}

// Check if the date is in one of the following formats:
// "2016-01-05T10:38:33.000+00:00"
// "2016-01-05T10:38:33+00:00"
// "2016-01-05T10:38:33.000Z"
// "2016-01-05T10:38:33Z"
// "2016-01-05 10:38:33"
function isDateFormat(str) {
	return /^\d{4}-\d{2}-\d{2}[T ]\d{2}:\d{2}:\d{2}(\.\d{3})?([+-]\d{2}:\d{2}|Z)?$/.test(
		str
	);
}

// Check if the field name is a date field that the API uses:
// - ends with "_date" or "_at"
// - is "created" or "last_login" or "send_on" or "start" or "end"
// - starts with "date_"
function isDateField(fieldName) {
	return /(_date$|_at$|^created$|^last_login|^send_on$|^start$|^end$|^date_)/.test(
		fieldName
	);
}

// convert date string, Date object, or moment object to a string in the format
// "2016-01-05T10:38:33-07:00" for consumption by the server
// i.e. basically moment just adds the "T" in the middle and "-07:00" at the end
function toUtc(dateStr) {
	let dateObj = moment(dateStr);
	if (!dateObj.isValid()) {
		return dateStr;
	}
	return dateObj.format();
}

// recursively iterate an object or array
// and convert dates to UTC as needed (for the server)
function mapToUtc(objOrArray) {
	forEach(objOrArray, (value, key) => {
		if (typeof value === 'object') {
			// object or array
			mapToUtc(value);
		} else if (
			typeof value === 'string' &&
			isDateField(key) &&
			(value instanceof Date || isDateFormat(value) || value instanceof moment)
		) {
			objOrArray[key] = toUtc(value);
		}
	});
}

// convert dates from the server into iso8601 format such as
// "2016-01-05T10:38:33" for consumption by application
function fromUtc(dateStr) {
	let dateObj = moment.utc(dateStr);
	if (!dateObj.isValid()) {
		return dateStr;
	}
	return dateObj
		.subtract(offsetMinutes, 'minutes')
		.format('YYYY-MM-DD\\THH:mm:ss');
}

// recursively iterate an object or array (from the server)
// and convert dates from UTC as needed
function mapFromUtc(objOrArray) {
	forEach(objOrArray, (value, key) => {
		if (typeof value === 'object') {
			// object or array
			mapFromUtc(value);
		} else if (
			typeof value === 'string' &&
			isDateField(key) &&
			isDateFormat(value)
		) {
			objOrArray[key] = fromUtc(value);
		}
	});
}
