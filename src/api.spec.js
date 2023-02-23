const ApiService = require('./ApiService/ApiService.js');
const api = require('./api.js');
const {
	mockResponse,
	clearFetchMocks,
	stopMockingFetch,
} = require('./mockNodeNativeFetch/mockNodeNativeFetch.js');

const { get, post, head, put, patch, del, patchDifference, abort, submitJob } =
	api;

describe('api instance', () => {
	it('should be an object instance', () => {
		expect(api).toBeInstanceOf(ApiService);
	});
});
describe('other exports', () => {
	it('should be functions', () => {
		expect(get).toBeInstanceOf(Function);
		expect(post).toBeInstanceOf(Function);
		expect(head).toBeInstanceOf(Function);
		expect(put).toBeInstanceOf(Function);
		expect(patch).toBeInstanceOf(Function);
		expect(del).toBeInstanceOf(Function);
		expect(patchDifference).toBeInstanceOf(Function);
		expect(abort).toBeInstanceOf(Function);
		expect(submitJob).toBeInstanceOf(Function);
	});
});
describe('Handle real caching situation', () => {
	it('should return identical response object if cached', async () => {
		const promise1 = api.get(
			'https://httpbin.org/get',
			{ b: 2 },
			{
				cacheFor: 30000,
			}
		);
		const resp1 = await promise1;
		const promise2 = api.get('https://httpbin.org/get?b=2');
		const resp2 = await promise2;
		expect(resp1).toBe(resp2);
	});
});
describe('Playing nice with mok', () => {
	beforeAll(() => {
		mockResponse({
			url: 'https://example.com/foo',
			headers: {
				'Content-type': 'application/json',
				Header1: 'Value1',
			},
			body: { bar: 'baz' },
		});
	});
	afterEach(clearFetchMocks);
	afterAll(stopMockingFetch);
	it('should allow mocking responses', async () => {
		const fakeUrl = 'https://example.com/foo';
		const resp = await api.get(fakeUrl);
		expect(resp.data).toEqual({ bar: 'baz' });
		expect(resp.headers.header1).toEqual('Value1');
	});
});
describe('ApiResponse#debug()', () => {
	it('should properly capture response and request', async () => {
		const resp = await api.get(
			'https://httpbin.org/get',
			{ b: 'two' },
			{
				headers: { hello: 'world' },
			}
		);
		const debug = resp.debug();
		expect(debug.status).toBe(200);
		expect(debug.statusText).toBe('OK');
		expect(debug.data.args).toEqual({ b: 'two' });
		expect(debug.request.method).toBe('GET');
		expect(debug.request.endpoint).toBe('https://httpbin.org/get');
		expect(debug.request.params).toEqual({ b: 'two' });
		expect(debug.request.headers.hello).toBe('world');
	});
});
