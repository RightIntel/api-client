const dateInterceptor = require('./dateInterceptor.js');
const { format, formatUtc } = require('../../dateUtils/dateUtils.js');
const ApiRequest = require('../../ApiRequest/ApiRequest.js');
const ApiResponse = require('../../ApiResponse/ApiResponse.js');

const interceptor = dateInterceptor;

describe('dateInterceptor requests', () => {
	it('should transform request data and params', () => {
		const time1 = '2016-06-01 12:00:00';
		const time1Offset = formatUtc(new Date(2016, 5, 1, 12));
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
		const time1Offset = formatUtc(new Date(2016, 5, 1, 12));
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
		const time1Utc = '2016-06-01T18:00:00+00:00';
		const time1Date = new Date(Date.UTC(2016, 5, 1, 18, 0, 0));
		time1Date.setUTCMinutes(
			time1Date.getUTCMinutes() - time1Date.getTimezoneOffset()
		);
		const processedDate = format(time1Date);
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
		interceptor.response(response);
		expect(response.data.created_at).toBe(day1);
	});

	it('should ignore text responses', () => {
		const text = 'Hello at 2016-06-01T18:00:00+00:00';
		const response = new ApiResponse({
			request: {},
			data: text,
			type: 'text',
		});
		interceptor.response(response);
		expect(response.data).toBe(text);
	});
});
