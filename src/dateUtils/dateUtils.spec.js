const {
	isDateFormat,
	isDateField,
	getOffsetString,
} = require('./dateUtils.js');

describe('dateUtils isDateFormat()', () => {
	it('should handle milliseconds and tz', () => {
		const result = isDateFormat('2016-01-05T10:38:33.000+00:00');
		expect(result).toBe(true);
	});
	it('should handle tz', () => {
		const result = isDateFormat('2016-01-05T10:38:33-00:00');
		expect(result).toBe(true);
	});
	it('should handle milliseconds with Z', () => {
		const result = isDateFormat('2016-01-05T10:38:33.000Z');
		expect(result).toBe(true);
	});
	it('should handle Z', () => {
		const result = isDateFormat('2016-01-05T10:38:33Z');
		expect(result).toBe(true);
	});
	it('should handle T', () => {
		const result = isDateFormat('2016-01-05T10:38:33');
		expect(result).toBe(true);
	});
	it('should handle space', () => {
		const result = isDateFormat('2016-01-05 10:38:33');
		expect(result).toBe(true);
	});
	it('should ignore dates without time', () => {
		const result = isDateFormat('2016-01-05');
		expect(result).toBe(false);
	});
});
describe('dateUtils isDateField()', () => {
	it('should handle *_date', () => {
		const result = isDateField('run_date');
		expect(result).toBe(true);
	});
	it('should handle *_at', () => {
		const result = isDateField('created_at');
		expect(result).toBe(true);
	});
	it('should handle created', () => {
		const result = isDateField('created');
		expect(result).toBe(true);
	});
	it('should handle last_login', () => {
		const result = isDateField('last_login');
		expect(result).toBe(true);
	});
	it('should handle send_on', () => {
		const result = isDateField('send_on');
		expect(result).toBe(true);
	});
	it('should handle start', () => {
		const result = isDateField('start');
		expect(result).toBe(true);
	});
	it('should handle end', () => {
		const result = isDateField('end');
		expect(result).toBe(true);
	});
	it('should handle date_*', () => {
		const result = isDateField('begin_date');
		expect(result).toBe(true);
	});
	it('should ignore friend', () => {
		const result = isDateField('friend');
		expect(result).toBe(false);
	});
	it('should ignore is_recreated', () => {
		const result = isDateField('is_recreated');
		expect(result).toBe(false);
	});
});
describe('dateUtils getOffsetString()', () => {
	it('should handle 0', () => {
		const result = getOffsetString(0);
		expect(result).toBe('+00:00');
	});
	it('should make positive numbers negative', () => {
		const result = getOffsetString(480);
		expect(result).toBe('-08:00');
	});
	it('should make negative numbers positive', () => {
		const result = getOffsetString(-720);
		expect(result).toBe('+12:00');
	});
	it('should handle fractions', () => {
		const result = getOffsetString(-45);
		expect(result).toBe('+00:45');
	});
});
