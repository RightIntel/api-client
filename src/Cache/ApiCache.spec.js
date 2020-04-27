const ApiCache = require('./ApiCache.js');

jest.useFakeTimers();

describe('ApiCache getMilliseconds() function', () => {
	it('should parrot numbers', () => {
		const cache = new ApiCache();
		const milliseconds = cache.getMilliseconds(30000);
		expect(milliseconds).toBe(30000);
	});
	it('should handle ms', () => {
		const cache = new ApiCache();
		const milliseconds = cache.getMilliseconds('500ms');
		expect(milliseconds).toBe(500);
	});
	it('should handle s', () => {
		const cache = new ApiCache();
		const milliseconds = cache.getMilliseconds('30s');
		expect(milliseconds).toBe(1000 * 30);
	});
	it('should handle m', () => {
		const cache = new ApiCache();
		const milliseconds = cache.getMilliseconds('3m');
		expect(milliseconds).toBe(1000 * 3 * 60);
	});
	it('should handle m with s', () => {
		const cache = new ApiCache();
		const milliseconds = cache.getMilliseconds('3m 30s');
		expect(milliseconds).toBe(1000 * 3.5 * 60);
	});
	it('should handle h', () => {
		const cache = new ApiCache();
		const milliseconds = cache.getMilliseconds('3h');
		expect(milliseconds).toBe(1000 * 3 * 60 * 60);
	});
	it('should handle d', () => {
		const cache = new ApiCache();
		const milliseconds = cache.getMilliseconds('2d');
		expect(milliseconds).toBe(1000 * 2 * 60 * 60 * 24);
	});
	it('should handle decimals', () => {
		const cache = new ApiCache();
		const milliseconds = cache.getMilliseconds('2.5d');
		expect(milliseconds).toBe(1000 * 2.5 * 60 * 60 * 24);
	});
	it('should handle spaces', () => {
		const cache = new ApiCache();
		const milliseconds = cache.getMilliseconds('2 hours');
		expect(milliseconds).toBe(1000 * 2 * 60 * 60);
	});
});

describe('ApiCache find() function', () => {
	it('should find a matching item', () => {
		const cache = new ApiCache();
		const promise = Promise.resolve(1);
		cache.add(promise, 'GET', '/abc', {}, 1000);
		const found = cache.find('GET', '/abc', {});
		expect(found).toBe(promise);
	});
	it('should not find a mismatching item', () => {
		const cache = new ApiCache();
		const promise = Promise.resolve(1);
		cache.add(promise, 'GET', '/abc', {}, 1000);
		const found = cache.find('GET', '/def', {});
		expect(found).toBe(null);
	});
});

describe('ApiCache add() function', () => {
	it('should add an item', () => {
		const cache = new ApiCache();
		cache.add({}, 'GET', '/abc', {}, 1000);
		expect(cache.requests).toHaveLength(1);
	});
	it('should clear all items', () => {
		const cache = new ApiCache();
		cache.add({}, 'GET', '/abc', {}, 1000);
		cache.add({}, 'GET', '/def', {}, 1000);
		cache.clear();
		expect(cache.requests).toHaveLength(0);
	});
	it('should clear by method', () => {
		const cache = new ApiCache();
		cache.add({}, 'GET', '/abc', {}, 1000);
		cache.add({}, 'POST', '/abc', {}, 1000);
		cache.add({}, 'GET', '/def', {}, 1000);
		cache.clear('GET');
		expect(cache.requests).toHaveLength(1);
	});
	it('should clear by method', () => {
		const cache = new ApiCache();
		cache.add({}, 'GET', '/abc', {}, 1000);
		cache.add({}, 'GET', '/abc', {}, 1000);
		cache.add({}, 'GET', '/def', {}, 1000);
		cache.clear('GET', '/abc');
		expect(cache.requests).toHaveLength(1);
	});
	it('should clear by regexp', () => {
		const cache = new ApiCache();
		cache.add({}, 'GET', '/abc', {}, 1000);
		cache.add({}, 'POST', '/abcd', {}, 1000);
		cache.add({}, 'GET', '/def', {}, 1000);
		cache.clear(/GET|POST/, /abc/);
		expect(cache.requests).toHaveLength(1);
	});
	it('should not error if cache somehow goes missing', () => {
		const cache = new ApiCache();
		cache.add({}, 'GET', '/abc', {}, 1000);
		cache.requests = [];
		jest.advanceTimersByTime(2000);
		expect(cache.requests).toHaveLength(0);
	});
});

describe('ApiCache expiration', () => {
	it('should add an item', () => {
		const cache = new ApiCache();
		cache.add({}, 'GET', '/abc', {}, 100);
		expect(cache.requests).toHaveLength(1);
		jest.advanceTimersByTime(200);
		expect(cache.requests).toHaveLength(0);
	});
});
