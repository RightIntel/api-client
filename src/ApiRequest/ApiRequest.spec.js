const ApiRequest = require('./ApiRequest.js');

describe('ApiRequest method getter/setter', () => {
	it('should be uppercase (constructor)', () => {
		const request = new ApiRequest('get');
		expect(request.method).toBe('GET');
	});
	it('should be uppercase (set)', () => {
		const request = new ApiRequest('get');
		request.setMethod('post');
		expect(request.method).toBe('POST');
	});
});

describe('ApiRequest header getter/setter', () => {
	it('should keep an object', () => {
		const request = new ApiRequest();
		request.headers = { A: '1' };
		expect(request.headers).toEqual({ A: '1' });
	});
	it('should accept a Headers object', () => {
		const headers = new Headers([['A', '1']]);
		const request = new ApiRequest('get', '/', {}, {}, { headers });
		expect(request.headers).toBeInstanceOf(Object);
		// note that Headers automatically normalizes header names to lower case
		expect(request.headers).toEqual({ a: '1' });
	});
	it('should allow setting headers', () => {
		const request = new ApiRequest();
		request.headers.A = '1';
		expect(request.headers).toBeInstanceOf(Object);
		expect(request.headers.A).toBe('1');
	});
});

describe('ApiRequest params getter/setter', () => {
	it('should convert string to object', () => {
		const request = new ApiRequest();
		request.setParams('a=1');
		expect(request.params).toEqual({ a: '1' });
	});
	it('should convert empty string to empty object', () => {
		const request = new ApiRequest();
		request.setParams('');
		expect(request.params).toEqual({});
	});
	it('should ignore leading question marks', () => {
		const request = new ApiRequest();
		request.setParams('?a=1');
		expect(request.params).toEqual({ a: '1' });
	});
	it('should keep object as object', () => {
		const request = new ApiRequest();
		request.setParams({ b: '2' });
		expect(request.params).toEqual({ b: '2' });
	});
	it('should convert URLSearchParams object', () => {
		const request = new ApiRequest();
		request.setParams(new URLSearchParams({ b: '2' }));
		expect(request.params).toEqual({ b: '2' });
	});
	it('should allow setting params sub-property', () => {
		const request = new ApiRequest('get', '/abc', {});
		request.params.b = '2';
		expect(request.params).toEqual({ b: '2' });
	});
});

describe('ApiRequest queryString getter/setter ', () => {
	it('should return empty string for empty params', () => {
		const request = new ApiRequest();
		request.setParams({});
		expect(request.queryString).toBe('');
	});
	it('Should serialize alphabetically (object)', () => {
		const request = new ApiRequest();
		request.setParams({ b: 2, a: 1 });
		expect(request.queryString).toBe('a=1&b=2');
	});
	it('Should serialize alphabetically (string)', () => {
		const request = new ApiRequest();
		request.setParams('b=2&a=1');
		expect(request.queryString).toBe('a=1&b=2');
	});
	it('Should encode URL entities', () => {
		const request = new ApiRequest();
		request.setParams({
			a: '= ',
		});
		expect(request.queryString).toBe('a=%3D%20');
	});
	it('Should handle lists with simple commas', () => {
		const request = new ApiRequest();
		request.setParams({
			ab: [1, 2],
		});
		expect(request.queryString).toBe('ab=1,2');
	});
	it('Should handle setting to string', () => {
		const request = new ApiRequest();
		request.setQueryString('?b=2&a=1');
		expect(request.queryString).toBe('a=1&b=2');
		expect(request.params).toEqual({ b: '2', a: '1' });
	});
	it('Should handle setting to object', () => {
		const request = new ApiRequest();
		request.setQueryString({ b: 2, a: 1 });
		expect(request.queryString).toBe('a=1&b=2');
		expect(request.params).toEqual({ b: 2, a: 1 });
	});
});

describe('ApiRequest url getter/setter', () => {
	it('should leave /request endpoints as is', () => {
		const request = new ApiRequest('get', '/api/v3/posts/search');
		expect(request.url).toBe('/api/v3/posts/search');
	});
	it('should return add /request if needed', () => {
		const request = new ApiRequest('get', '/v3/posts/search');
		expect(request.url).toBe('/api/v3/posts/search');
	});
	it('should return add /v2 if needed', () => {
		const request = new ApiRequest('get', '/posts');
		expect(request.url).toBe('/api/v2/posts');
	});
	it('should leave http URLs alone', () => {
		const request = new ApiRequest('get', 'https://example.com/a');
		expect(request.url).toBe('https://example.com/a');
	});
	it('should leave https URLs alone', () => {
		const request = new ApiRequest('get', 'https://example.com/a');
		expect(request.url).toBe('https://example.com/a');
	});
	it('should leave implied protocol URLs alone', () => {
		const request = new ApiRequest('get', '://example.com/a');
		expect(request.url).toBe('://example.com/a');
	});
	it('should leave double slash URLs alone', () => {
		const request = new ApiRequest('get', '//example.com/a');
		expect(request.url).toBe('//example.com/a');
	});
	it('should handle baseURL', () => {
		const request = new ApiRequest(
			'get',
			'/a',
			{},
			{},
			{ baseURL: 'https://example.com' }
		);
		expect(request.url).toBe('https://example.com/api/v2/a');
	});
	it('should allow URL objects', () => {
		const request = new ApiRequest('get', new URL('https://example.com/a'));
		expect(request.url).toBe('https://example.com/a');
	});
	it('should allow setting url to URL object', () => {
		const request = new ApiRequest();
		request.setUrl(new URL('https://example.com/a'));
		expect(request.url).toBe('https://example.com/a');
	});
	it('should allow setting endpoint to update URL', () => {
		const request = new ApiRequest('get', '');
		request.setEndpoint('/posts');
		expect(request.url).toEqual('/api/v2/posts');
	});
	it('should handle when endpoint is empty string', () => {
		const request = new ApiRequest('get', '/abc');
		request.setEndpoint('');
		expect(request.url).toBe('/api/v2');
	});
	it('should handle when endpoint is false', () => {
		const request = new ApiRequest('get', '/abc');
		request.setEndpoint(false);
		expect(request.url).toBe('/api/v2');
	});
	it('should handle when endpoint is null', () => {
		const request = new ApiRequest('get', '/abc');
		request.setEndpoint(null);
		expect(request.url).toBe('/api/v2');
	});
	it('should remove hash symbol', () => {
		const request = new ApiRequest('get', '/abc#');
		expect(request.url).toBe('/api/v2/abc');
	});
	it('should remove hash value', () => {
		const request = new ApiRequest('get', '/abc#123');
		expect(request.url).toBe('/api/v2/abc');
	});
	it('should allow setting object params', () => {
		const request = new ApiRequest('get', '/abc', {
			a: '1',
		});
		expect(request.url).toEqual('/api/v2/abc?a=1');
	});
	it('should allow setting string params and object params', () => {
		const request = new ApiRequest('get', '/abc?b=2', {
			a: '1',
		});
		expect(request.url).toEqual('/api/v2/abc?a=1&b=2');
	});
	it('should allow object params to override string params', () => {
		const request = new ApiRequest('get', '/abc?a=one&b=2', { a: '1' });
		expect(request.url).toEqual('/api/v2/abc?a=1&b=2');
	});
	it('should serialize undefined properly', () => {
		const request = new ApiRequest('get', '/abc', {
			a: undefined,
			b: 2,
		});
		expect(request.url).toEqual('/api/v2/abc?b=2');
	});
	it('should serialize null properly', () => {
		const request = new ApiRequest('get', '/abc', {
			a: null,
			b: 2,
		});
		expect(request.url).toEqual('/api/v2/abc?b=2');
	});
	it('should serialize true properly', () => {
		const request = new ApiRequest('get', '/abc', {
			a: true,
			b: 2,
		});
		expect(request.url).toEqual('/api/v2/abc?a=1&b=2');
	});
	it('should serialize false properly', () => {
		const request = new ApiRequest('get', '/abc', {
			a: false,
			b: 2,
		});
		expect(request.url).toEqual('/api/v2/abc?a=0&b=2');
	});
	it('should serialize arrays into comma-delimited string', () => {
		const request = new ApiRequest('get', '/abc', {
			a: ['1.1', '1.2'],
			b: 2,
		});
		expect(request.url).toEqual('/api/v2/abc?a=1.1,1.2&b=2');
	});
});

describe('ApiRequest send', () => {
	it('should leave /request endpoints as is', async () => {
		const request = new ApiRequest('get', 'https://httpbin.org/get', {
			a: '1',
		});
		const promise = request.send();
		expect(request.pending).toBe(true);
		try {
			const response = await promise;
			const data = await response.json();
			expect(data.args).toEqual({ a: '1' });
			expect(request.pending).toBe(false);
		} catch (e) {}
	});
});

describe('ApiRequest abort', () => {
	it('should cause rejection', async () => {
		const request = new ApiRequest('get', 'https://httpbin.org/get', {
			a: '1',
		});
		const promise = request.send();
		request.abort();
		try {
			await promise;
		} catch (error) {
			expect(error).toBeInstanceOf(Error);
			expect(request.pending).toBe(false);
		}
	});
	it('should not error if request was never sent', async () => {
		const request = new ApiRequest('get', 'https://httpbin.org/get', {
			a: '1',
		});
		request.abort();
		expect(request.pending).toBe(false);
	});
});
