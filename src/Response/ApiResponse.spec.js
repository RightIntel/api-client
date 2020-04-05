const ApiResponse = require('./ApiResponse.js');

describe('ApiResponse instance', () => {
	let response, headers, apiResp;
	beforeEach(() => {
		headers = {
			'API-Total-Records': '57',
			'API-Response-Time': '88',
			'API-Response-Notices': JSON.stringify(['notice']),
			'API-Response-Errors': JSON.stringify(['error']),
			'Content-Length': '4096',
			'Content-Type': 'application/json',
			'API-New-Record-Id': '1234',
			get: function (name) {
				return this[name] || `Mock ${name}`;
			},
		};
		response = {
			ok: true,
			status: 200,
			statusText: 'OK',
			headers,
		};
		apiResp = new ApiResponse({
			endpoint: '/v2/posts/search',
			request: {
				searchParams: {
					limit: '25',
					page: '1',
					term: 'testing',
				},
			},
			response,
			type: 'json',
			data: [
				{
					id: 1,
				},
			],
			text: null,
		});
	});
	it('should be testable', () => {
		expect(ApiResponse).toBeTruthy();
	});
	it('should return rawResponse', () => {
		expect(apiResp.rawResponse).toBe(response);
	});
	it('should return ok', () => {
		expect(apiResp.ok).toBe(true);
	});
	it('should return status', () => {
		expect(apiResp.status).toBe(200);
	});
	it('should return statusText', () => {
		expect(apiResp.statusText).toBe('OK');
	});
	it('should return statusClass', () => {
		expect(apiResp.statusClass).toBe('2xx');
	});
	it('should return headers', () => {
		expect(apiResp.headers).toBe(headers);
	});
	it('should return total', () => {
		expect(apiResp.total).toBe(57);
	});
	it('should return size', () => {
		expect(apiResp.size).toBe(1);
	});
	it('should return limit', () => {
		expect(apiResp.limit).toBe(25);
	});
	it('should return page', () => {
		expect(apiResp.page).toBe(1);
	});
	it('should return numPages', () => {
		expect(apiResp.numPages).toBe(3);
	});
	it('should return isEmpty', () => {
		expect(apiResp.isEmpty).toBe(false);
	});
	it('should return location', () => {
		expect(apiResp.location).toBe('Mock Location');
	});
	it('should return contentType', () => {
		expect(apiResp.contentType).toBe('application/json');
	});
	it('should return contentLength', () => {
		expect(apiResp.contentLength).toBe(4096);
	});
	it('should return notices', () => {
		expect(apiResp.notices).toEqual(['notice']);
	});
	it('should return errors', () => {
		expect(apiResp.errors).toEqual(['error']);
	});
	it('should return responseId', () => {
		expect(apiResp.responseId).toEqual('Mock API-Response-Id');
	});
	it('should return newId', () => {
		expect(apiResp.newId).toEqual(1234);
	});
	it('should return time', () => {
		expect(apiResp.time).toEqual(88);
	});
});
describe('ApiResponse newId from API-Record-Id', () => {
	let response, headers, apiResp;
	beforeEach(() => {
		headers = {
			'API-Record-Id': '1234',
			get: function (name) {
				return this[name] || false;
			},
		};
		response = {
			headers,
		};
		apiResp = new ApiResponse({
			response,
		});
	});
	it('should get newId from API-Record-Id', () => {
		expect(apiResp.newId).toBe(1234);
	});
});
describe('ApiResponse newId from Location', () => {
	let response, headers, apiResp;
	beforeEach(() => {
		headers = {
			Location: '/api/v2/posts/1234',
			get: function (name) {
				return this[name] || false;
			},
		};
		response = {
			headers,
		};
		apiResp = new ApiResponse({
			response,
		});
	});
	it('should get newId from Location', () => {
		expect(apiResp.newId).toBe(1234);
	});
});
describe('ApiResponse newId with UUID', () => {
	let response, headers, apiResp;
	beforeEach(() => {
		headers = {
			'API-New-Record-Id': 'my-uuid',
			get: function (name) {
				return this[name] || false;
			},
		};
		response = {
			headers,
		};
		apiResp = new ApiResponse({
			response,
		});
	});
	it('should get newId with UUID', () => {
		expect(apiResp.newId).toBe('my-uuid');
	});
});
describe('ApiResponse newId with null', () => {
	let response, headers, apiResp;
	beforeEach(() => {
		headers = {
			get: function (name) {
				return false;
			},
		};
		response = {
			headers,
		};
		apiResp = new ApiResponse({
			response,
		});
	});
	it('should get newId with null', () => {
		expect(apiResp.newId).toBe(null);
	});
});
describe('ApiResponse with null response', () => {
	let response, apiResp;
	beforeEach(() => {
		apiResp = new ApiResponse({});
	});
	it('should have Headers', () => {
		expect(apiResp.rawResponse).toBeInstanceOf(Object);
		expect(apiResp.rawResponse.headers).toBeInstanceOf(Headers);
	});
});
describe('ApiResponse URL extraction', () => {
	let apiResp;
	beforeEach(() => {
		apiResp = new ApiResponse({
			request: {
				url: '?limit=10',
			},
		});
	});
	it('should extract limit from URL', () => {
		expect(apiResp.limit).toBe(10);
	});
});
describe('ApiResponse URL undefined', () => {
	let apiResp;
	beforeEach(() => {
		apiResp = new ApiResponse({
			request: {},
		});
	});
	it('should fail to extract limit from URL', () => {
		expect(apiResp.limit).toBe(null);
	});
});
