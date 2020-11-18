const ApiService = require('./ApiService/ApiService.js');
const api = require('./api.js');
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
