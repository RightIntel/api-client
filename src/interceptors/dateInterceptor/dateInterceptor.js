const forEach = require('lodash/forEach');
const {
	isDateFormat,
	isDateField,
	fromUtc,
	toUtc,
	format,
} = require('../../dateUtils/dateUtils.js');

const dateInterceptor = {
	request,
	response,
	mapToUtc,
	mapFromUtc,
};

module.exports = dateInterceptor;

// Transform all requests and responses
// to convert date values to and from UTC time
function request(request) {
	if (request.params) {
		mapToUtc(request.params);
	}
	if (request.data) {
		mapToUtc(request.data);
	}
}
function response(response) {
	if (response.dataType !== 'json') {
		return;
	}
	mapFromUtc(response.data);
}

// recursively iterate an object or array
// and convert dates to UTC as needed (for the server)
function mapToUtc(objOrArray) {
	if (Array.isArray(objOrArray)) {
		for (const value of objOrArray) {
			if (typeof value === 'object') {
				mapToUtc(value);
			}
		}
	} else if (typeof objOrArray === 'object') {
		for (const key in objOrArray) {
			// istanbul ignore next
			if (!objOrArray.hasOwnProperty(key)) {
				continue;
			}
			const value = objOrArray[key];
			if (typeof value === 'object') {
				// another object or array
				mapToUtc(value);
				continue;
			}
			if (!isDateField(key)) {
				continue;
			}
			if (typeof value === 'string' && isDateFormat(value)) {
				objOrArray[key] = toUtc(value);
			} else if (typeof value !== 'object') {
				continue;
			}
			if (value instanceof Date) {
				objOrArray[key] = format(value);
			} else if (typeof value.toDate === 'function') {
				// moment and dayjs
				objOrArray[key] = format(value.toDate());
			} else if (typeof value.toJSDate === 'function') {
				// luxon
				objOrArray[key] = format(value.toJSDate());
			}
		}
	}
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
