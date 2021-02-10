const ApiService = require('./ApiService/ApiService.js');
const api = require('./api.js');
const fetchMock = require('fetch-mock');
const {
	get,
	post,
	head,
	put,
	patch,
	del,
	patchDifference,
	abort,
	submitJob,
} = api;

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
	it('should return identical promise and identical response object', async () => {
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
		expect(promise1).toBe(promise2);
		expect(resp1).toBe(resp2);
	});
});
describe('Playing nice with fetch-mock', () => {
	it('should allow mocking responses', async () => {
		const fakeUrl = 'https://example.com/foo';
		fetchMock.get(fakeUrl, {
			body: { bar: 'baz' },
			headers: {
				Header1: 'Value1',
			},
		});
		const resp = await api.get(fakeUrl);
		expect(resp.data).toEqual({ bar: 'baz' });
		expect(resp.headers.header1).toEqual('Value1');
	});
});
