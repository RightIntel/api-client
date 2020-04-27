const ApiRequest = require('./ApiRequest.js');

describe('ApiRequest method getter/setter', () => {
	it('should be uppercase (constructor)', () => {
		const request = new ApiRequest('get');
		expect(request.method).toBe('GET');
	});
	it('should be uppercase (set)', () => {
		const request = new ApiRequest('get');
		request.method = 'post';
		expect(request.method).toBe('POST');
	});
});

describe('ApiRequest params getter/setter', () => {
	it('should convert string to object', () => {
		const request = new ApiRequest();
		request.params = 'a=1';
		expect(request.params).toEqual({ a: '1' });
	});
	it('should convert empty string to empty object', () => {
		const request = new ApiRequest();
		request.params = '';
		expect(request.params).toEqual({});
	});
	it('should ignore leading question marks', () => {
		const request = new ApiRequest();
		request.params = '?a=1';
		expect(request.params).toEqual({ a: '1' });
	});
	it('should keep object as object', () => {
		const request = new ApiRequest();
		request.params = { b: '2' };
		expect(request.params).toEqual({ b: '2' });
	});
	it('should convert URLSearchParams object', () => {
		const request = new ApiRequest();
		request.params = new URLSearchParams({ b: '2' });
		expect(request.params).toEqual({ b: '2' });
	});
});

describe('ApiRequest queryString getter/setter ', () => {
	it('should return empty string for empty params', () => {
		const request = new ApiRequest();
		request.params = {};
		expect(request.queryString).toBe('');
	});
	it('Should serialize alphabetically (object)', () => {
		const request = new ApiRequest();
		request.params = { b: 2, a: 1 };
		expect(request.queryString).toBe('a=1&b=2');
	});
	it('Should serialize alphabetically (string)', () => {
		const request = new ApiRequest();
		request.params = 'b=2&a=1';
		expect(request.queryString).toBe('a=1&b=2');
	});
	it('Should encode URL entities', () => {
		const request = new ApiRequest();
		request.params = {
			a: '= ',
		};
		expect(request.queryString).toBe('a=%3D%20');
	});
	it('Should handle lists with simple commas', () => {
		const request = new ApiRequest();
		request.params = {
			ab: [1, 2],
		};
		expect(request.queryString).toBe('ab=1%2C2');
	});
	it('Should handle setting to string', () => {
		const request = new ApiRequest();
		request.queryString = '?b=2&a=1';
		expect(request.queryString).toBe('a=1&b=2');
	});
	it('Should handle setting to object', () => {
		const request = new ApiRequest();
		request.queryString = { b: 2, a: 1 };
		expect(request.queryString).toBe('a=1&b=2');
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
		expect(request.url).toBe('http://example.com/a');
	});
	it('should leave double slash URLs alone', () => {
		const request = new ApiRequest('get', '//example.com/a');
		expect(request.url).toBe('http://example.com/a');
	});
	it('should allow URL objects', () => {
		const request = new ApiRequest('get', new URL('https://example.com/a'));
		expect(request.url).toBe('https://example.com/a');
	});
	it('should allow setting url to URL object', () => {
		const request = new ApiRequest();
		request.url = new URL('https://example.com/a');
		expect(request.url).toBe('https://example.com/a');
	});
	it('should allow setting endpoint to update URL', () => {
		const request = new ApiRequest();
		request.endpoint = '/posts';
		expect(request.url).toBe('/api/v2/posts');
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
});
