const dateInterceptor = require('./dateInterceptor.js');
const ApiRequest = require('../../Request/ApiRequest.js');
const ApiResponse = require('../../Response/ApiResponse.js');
const moment = require('moment');

const zeropad = s => (s > 9 ? s : '0' + s);
const interceptor = dateInterceptor;
const {
	isDateField,
	isDateFormat,
	mapFromUtc,
	mapToUtc,
	fromUtc,
} = dateInterceptor;

describe('isDateFormat()', () => {
	it('should recognize ISO with milliseconds and timezone', () => {
		expect(isDateFormat('2016-01-05T10:38:33.000+00:00')).toBe(true);
	});

	it('should recognize ISO with timezone', () => {
		expect(isDateFormat('2016-01-05T10:38:33+00:00')).toBe(true);
	});

	it('should recognize ISO with milliseconds', () => {
		expect(isDateFormat('2016-01-05T10:38:33.000Z')).toBe(true);
	});

	it('should recognize ISO with a Z', () => {
		expect(isDateFormat('2016-01-05T10:38:33Z')).toBe(true);
	});

	it('should recognize ISO without a T', () => {
		expect(isDateFormat('2016-01-05 10:38:33')).toBe(true);
	});

	it('should not recognize dates without times', () => {
		expect(isDateFormat('2016-01-05')).toBe(false);
	});
});

describe('isDateField()', () => {
	it('should not recognize moo', () => {
		expect(isDateField('moo')).toBe(false);
	});

	it('should recognize *_at', () => {
		expect(isDateField('created_at')).toBe(true);
		expect(isDateField('modified_at')).toBe(true);
		expect(isDateField('deleted_at')).toBe(true);
		expect(isDateField('hello_at')).toBe(true);
		expect(isDateField('at')).toBe(false);
	});

	it('should recognize *_date', () => {
		expect(isDateField('happy_date')).toBe(true);
		expect(isDateField('something_date')).toBe(true);
	});

	it('should recognize date_*', () => {
		expect(isDateField('date_created')).toBe(true);
		expect(isDateField('date_moo')).toBe(true);
	});

	it('should recognize specials', () => {
		expect(isDateField('created')).toBe(true);
		expect(isDateField('last_login')).toBe(true);
		expect(isDateField('send_on')).toBe(true);
		expect(isDateField('start')).toBe(true);
		expect(isDateField('end')).toBe(true);
	});
});

describe('dateInterceptor requests', () => {
	it('should transform request data and params', () => {
		const time1 = '2016-06-01 12:00:00';
		const offset = new Date(2016, 5, 1).getTimezoneOffset() / 60;
		const time1Offset =
			'2016-06-01T12:00:00' +
			(offset > 0 ? '-' : '+') +
			zeropad(offset) +
			':00';
		const data = {
			created_at: time1,
			start_date: time1,
			level2: [
				{
					end_date: time1,
					begin_date: time1,
				},
			],
		};
		const params = {
			created: time1,
			last_login: time1,
		};
		let request = new ApiRequest('get', '/', params, data);
		interceptor.request(request);
		expect(request.data.created_at).toBe(time1Offset);
		expect(request.data.start_date).toBe(time1Offset);
		expect(request.params.created).toBe(time1Offset);
		expect(request.params.last_login).toBe(time1Offset);
		expect(request.data.level2[0].end_date).toBe(time1Offset);
		expect(request.data.level2[0].begin_date).toBe(time1Offset);
	});

	it('should not change dates with non-date keys', () => {
		const time1 = '2016-06-01 12:00:00';
		const params = { search_text: time1 };
		const data = { comment: time1 };
		let request = new ApiRequest('get', '/', params, data);
		interceptor.request(request);
		expect(request.params.search_text).toBe(time1);
		expect(request.data.comment).toBe(time1);
	});

	it('should handle URLSearchParams', () => {
		const time1 = '2016-06-01 12:00:00';
		const offset = new Date(2016, 5, 1).getTimezoneOffset() / 60;
		const time1Offset =
			'2016-06-01T12:00:00' +
			(offset > 0 ? '-' : '+') +
			zeropad(offset) +
			':00';
		const params = new URLSearchParams({ created_at: time1 });
		let request = new ApiRequest('get', '/', params);
		interceptor.request(request);
		expect(request.params.created_at).toBe(time1Offset);
	});

	it('should not change plain dates', () => {
		const day1 = '2016-06-01';
		const params = { created: day1 };
		const data = { created_at: day1 };
		let request = new ApiRequest('get', '/', params, data);
		interceptor.request(request);
		expect(request.params.created).toBe(day1);
		expect(request.data.created_at).toBe(day1);
	});

	it('should not change invalid dates', () => {
		const time1 = '9999-99-99 99:99:99';
		const params = { created: time1 };
		const data = { created_at: time1 };
		let request = new ApiRequest('get', '/', params, data);
		interceptor.request(request);
		expect(request.params.created).toBe(time1);
		expect(request.data.created_at).toBe(time1);
	});

	it('should do nothing if data and params is empty', () => {
		const request = new ApiRequest('get', '/');
		interceptor.request(request);
		expect(request.params).toEqual({});
	});
});

describe('dateInterceptor responses', () => {
	it('should transform response data', () => {
		const offset = new Date().getTimezoneOffset();
		const time1Utc = '2016-06-01T18:00:00+00:00';
		const processedDate = moment
			.utc(time1Utc)
			.subtract(offset, 'minutes')
			.format()
			.replace(/Z$/, '');
		const data = {
			modified_at: time1Utc,
			publish_date: time1Utc,
			last_login: time1Utc,
			level2: [
				{
					created: time1Utc,
				},
			],
		};
		const response = new ApiResponse({
			request: {},
			data,
			type: 'json',
		});
		interceptor.response(response);
		expect(response.data.modified_at).toBe(processedDate);
		expect(response.data.publish_date).toBe(processedDate);
		expect(response.data.last_login).toBe(processedDate);
		expect(response.data.level2[0].created).toBe(processedDate);
	});

	it('should not change plain dates', () => {
		const day1 = '2016-06-01';
		const response = new ApiResponse({
			request: {},
			data: {
				a: { created_at: day1 },
				b: { created: day1 },
			},
			type: 'json',
		});
		interceptor.response(response);
		expect(response.data.a.created_at).toBe(day1);
		expect(response.data.b.created).toBe(day1);
	});

	it('should not change invalid dates', () => {
		const day1 = '9999-99-99 99:99:99';
		const response = new ApiResponse({
			request: {},
			data: { created_at: day1 },
			type: 'json',
		});
		interceptor.response({ response });
		expect(response.data.created_at).toBe(day1);
	});
});
