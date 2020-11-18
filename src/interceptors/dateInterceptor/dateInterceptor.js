const parser = require('any-date-parser');

const dateInterceptor = {
	request,
	response,
	isDateField,
	isDateFormat,
	toUtc,
	fromUtc,
	mapToUtc,
	mapFromUtc,
	zeropad,
	getOffsetString,
	format,
	formatUtc,
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

// convert date string to a string in the format
// "2016-01-05T10:38:33-07:00" for consumption by the server
function toUtc(dateStr) {
	let dateObj = parser.fromString(dateStr);
	if (dateObj.invalid) {
		return dateStr;
	}
	return format(dateObj);
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

// convert dates from the server into ISO-8601 format such as
// "2016-01-05T10:38:33" for consumption by application
function fromUtc(dateStr) {
	let dateObj = parser.fromString(dateStr);
	if (dateObj.invalid) {
		return dateStr;
	}
	return formatUtc(dateObj);
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

// pad a number to two digits
function zeropad(n) {
	return (n < 10 ? '0' : '') + n;
}

// given a Number of minutes offset, return an offset string
function getOffsetString(minutes) {
	const sign = minutes < 0 ? '+' : '-';
	minutes = Math.abs(minutes);
	const h = zeropad(Math.floor(minutes / 60));
	const m = zeropad(minutes % 60);
	return `${sign}${h}:${m}`;
}

// format a date object to ISO-8601 format
function format(date) {
	const Y = date.getUTCFullYear();
	const M = zeropad(date.getUTCMonth() + 1);
	const D = zeropad(date.getUTCDate());
	const H = zeropad(date.getUTCHours());
	const m = zeropad(date.getUTCMinutes());
	const s = zeropad(date.getUTCSeconds());
	const o = getOffsetString(date.getTimezoneOffset());
	return `${Y}-${M}-${D}T${H}:${m}:${s}${o}`;
}

// shift the date by the runtime's current offset and format it
function formatUtc(date) {
	date.setUTCMinutes(date.getUTCMinutes() - date.getTimezoneOffset());
	return format(date);
}
