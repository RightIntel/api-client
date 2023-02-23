const MS = 1;
const SEC = 1000;
const MIN = 60 * SEC;
const HOUR = 60 * MIN;
const DAY = 24 * HOUR;
const WEEK = 7 * DAY;
const MONTH = 30 * DAY;
const YEAR = 365 * DAY;

const lookup = {
	milliseconds: MS,
	millisecond: MS,
	ms: MS,
	seconds: SEC,
	second: SEC,
	sec: SEC,
	s: SEC,
	minutes: MIN,
	minute: MIN,
	min: MIN,
	m: MIN,
	hours: HOUR,
	hour: HOUR,
	hr: HOUR,
	h: HOUR,
	days: DAY,
	day: DAY,
	d: DAY,
	weeks: WEEK,
	week: WEEK,
	wk: WEEK,
	w: WEEK,
	months: MONTH,
	month: MONTH,
	b: MONTH,
	years: YEAR,
	year: YEAR,
	yr: YEAR,
	y: YEAR,
};

/**
 * Convert a duration string to milliseconds (e.g. "14 days", "2.5min", "4h", etc.)
 * @param durationString  The string to parse
 * @returns {number}
 */
function parseDuration(durationString) {
	const match = durationString?.match(/^([\d.]+)\s*([a-z]+)$/i);
	if (!match) {
		throw new Error(`Error parsing duration "${durationString}"`);
	}
	const value = parseFloat(match[1]);
	const unit = lookup[match[2].toLowerCase()];
	if (value > 0 && unit > 0) {
		return value * unit;
	} else if (value > 0) {
		throw new Error(`Unknown duration unit in "${durationString}"`);
	} else if (unit > 0) {
		throw new Error(`Duration must be greater than zero "${durationString}`);
	}
}

module.exports = parseDuration;
