const parser = require('any-date-parser');

const dateUtils = {
	isDateFormat,
	isDateField,
	fromUtc,
	toUtc,
	zeropad,
	getOffsetString,
	format,
	formatUtc,
};

module.exports = dateUtils;

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

// convert dates from the server into ISO-8601 format such as
// "2016-01-05T10:38:33" for consumption by application
function fromUtc(dateStr) {
	let dateObj = parser.fromString(dateStr);
	if (dateObj.invalid) {
		return dateStr;
	}
	return formatUtc(dateObj);
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

// pad a number to two digits
function zeropad(n) {
	return (n < 10 ? '0' : '') + n;
}

// given a Number of minutes offset, return an offset string
function getOffsetString(minutes) {
	const sign = minutes <= 0 ? '+' : '-';
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
