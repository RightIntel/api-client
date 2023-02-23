const ApiCache = require('./ApiCache.js');
const ApiRequest = require('../ApiRequest/ApiRequest.js');

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
		expect.assertions(2);
		const cache = new ApiCache();
		const request = new ApiRequest('get', '/abc');
		const promise = Promise.resolve(1);
		cache.add(request, promise);
		const found = cache.find(new ApiRequest('get', '/abc'));
		expect(typeof found?.then).toBe('function');
		found.then(result => {
			expect(result).toBe(1);
		});
	});
	it('should not find a mismatching item', () => {
		const cache = new ApiCache();
		const request = new ApiRequest('get', '/abc', null, {
			cacheFor: '1s',
		});
		const promise = Promise.resolve(1);
		cache.add(request, promise);
		const found = cache.find(new ApiRequest('get', '/def'));
		expect(found).toBe(null);
	});
});

describe('ApiCache add() function', () => {
	it('should add an item', () => {
		const cache = new ApiCache();
		const request = new ApiRequest('get', '/abc');
		cache.add(request, Promise.resolve('a'));
		expect(cache.entries).toHaveLength(1);
	});
	it('should clear all items', () => {
		const cache = new ApiCache();
		cache.add(new ApiRequest('get', '/abc'), Promise.resolve('a'));
		cache.add(new ApiRequest('get', '/def'), Promise.resolve('d'));
		cache.clear();
		expect(cache.entries).toHaveLength(0);
	});
	it('should clear by method', () => {
		const cache = new ApiCache();
		cache.add(new ApiRequest('get', '/abc'), Promise.resolve('a'));
		cache.add(new ApiRequest('post', '/abc'), Promise.resolve('a'));
		cache.add(new ApiRequest('get', '/def'), Promise.resolve('d'));
		cache.clear('GET');
		expect(cache.entries).toHaveLength(1);
	});
	it('should clear by method', () => {
		const cache = new ApiCache();
		cache.add(new ApiRequest('get', '/abc'), Promise.resolve('a'));
		cache.add(new ApiRequest('get', '/abc'), Promise.resolve('a'));
		cache.add(new ApiRequest('get', '/def'), Promise.resolve('d'));
		cache.clear('get', '/abc');
		expect(cache.entries).toHaveLength(1);
	});
	it('should clear by regexp', () => {
		const cache = new ApiCache();
		cache.add(new ApiRequest('get', '/abc'), Promise.resolve('a'));
		cache.add(new ApiRequest('post', '/abc'), Promise.resolve('a'));
		cache.add(new ApiRequest('get', '/def'), Promise.resolve('d'));
		cache.clear(/GET|POST/, /abc/);
		expect(cache.entries).toHaveLength(1);
	});
	it('should not error if cache somehow goes missing', () => {
		const cache = new ApiCache();
		cache.add(
			new ApiRequest('get', '/abc', null, {
				cacheFor: 1000,
			}),
			Promise.resolve('a')
		);
		cache.entries = [];
		jest.advanceTimersByTime(2000);
		expect(cache.entries).toHaveLength(0);
	});
});

describe('ApiCache expiration', () => {
	it('should add an item', () => {
		const cache = new ApiCache();
		cache.add(
			new ApiRequest('get', '/abc', null, null, {
				cacheFor: '100ms',
			}),
			Promise.resolve('a')
		);
		expect(cache.entries).toHaveLength(1);
		jest.advanceTimersByTime(200);
		expect(cache.entries).toHaveLength(0);
	});
});
