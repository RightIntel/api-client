const ApiService = require('./ApiService.js');
const ApiRequest = require('../ApiRequest/ApiRequest.js');
const ApiResponse = require('../ApiResponse/ApiResponse.js');
const ApiError = require('../ApiError/ApiError.js');
const ky = require('../ky/ky.js');

describe('ApiService class', () => {
	it('should be instantiable', () => {
		expect(new ApiService()).toBeInstanceOf(ApiService);
	});
});

describe('ApiService get() function', () => {
	/*
	example response:

	{
		args: { c: '3', d: '4' },
		headers: {
			Accept: '* /*',
			'Accept-Encoding': 'gzip,deflate',
				Host: 'httpbin.org',
				'User-Agent': 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)'
		},
		origin: '24.10.132.226, 24.10.132.226',
		url: 'https://httpbin.org/get?c=3&d=4'
	}

	*/

	it('should promise an ApiResponse', async () => {
		const api = new ApiService();
		const response = await api.get('https://httpbin.org/get');
		expect(response).toBeInstanceOf(ApiResponse);
	});

	it('should handle object params', async () => {
		const api = new ApiService();
		const response = await api.get('https://httpbin.org/get', { a: 1, b: 2 });
		expect(response.data.args).toEqual({ a: '1', b: '2' });
	});

	it('should handle string params', async () => {
		const api = new ApiService();
		const response = await api.get('https://httpbin.org/get?c=3&d=4');
		expect(response.data.args).toEqual({ c: '3', d: '4' });
	});
});

describe('ApiService other named functions', () => {
	/*
	example response:

	{
		args: { c: '3', d: '4' },
		headers: {
			Accept: '* /*',
			'Accept-Encoding': 'gzip,deflate',
			Host: 'httpbin.org',
			'User-Agent': 'node-fetch/1.0 (+https://github.com/bitinn/node-fetch)'
		},
		origin: '24.10.132.226, 24.10.132.226',
		url: 'https://httpbin.org/get?c=3&d=4'
	}

	*/

	it('should handle head', async () => {
		const api = new ApiService();
		const response = await api.head('https://httpbin.org/get?m=head');
		expect(response).toBeInstanceOf(ApiResponse);
		expect(response.ok).toBe(true);
	});
	it('should handle put', async () => {
		const api = new ApiService();
		const response = await api.put('https://httpbin.org/put?m=put');
		expect(response).toBeInstanceOf(ApiResponse);
		expect(response.ok).toBe(true);
		expect(response.data.args.m).toBe('put');
	});
	it('should handle patch', async () => {
		const api = new ApiService();
		const response = await api.patch('https://httpbin.org/patch?m=patch');
		expect(response).toBeInstanceOf(ApiResponse);
		expect(response.ok).toBe(true);
		expect(response.data.args.m).toBe('patch');
	});
	it('should handle delete', async () => {
		const api = new ApiService();
		const response = await api.delete('https://httpbin.org/delete?m=delete');
		expect(response).toBeInstanceOf(ApiResponse);
		expect(response.ok).toBe(true);
		expect(response.data.args.m).toBe('delete');
	});
	it('should handle patchDifference', async () => {
		const api = new ApiService();
		const oldValues = { dept: 42, name: 'Jon' };
		const newValues = { dept: 42, name: 'Jonathan' };
		const result = await api.patchDifference(
			'https://httpbin.org/patch',
			oldValues,
			newValues
		);
		expect(result.diff).toEqual({ name: 'Jonathan' });
		expect(result.hasChanges).toEqual(true);
		expect(result.response.request.data).toEqual({ name: 'Jonathan' });
		expect(result.response.ok).toBe(true);
	});
	it('should handle patchDifference with no difference', async () => {
		const api = new ApiService();
		const oldValues = { dept: 42, name: 'Jonathan' };
		const newValues = { dept: 42, name: 'Jonathan' };
		const result = await api.patchDifference(
			'https://httpbin.org/patch',
			oldValues,
			newValues
		);
		// TODO: is this what we want to resolve?
		// TODO: maybe we resolve with a ApiNoRequest object?
		expect(result).toEqual({
			diff: {},
			hasChanges: false,
			response: null,
		});
	});
	// TODO: submitJob using fetchmock
});

describe('ApiService errors', () => {
	it('should promise an ApiError object', async () => {
		const api = new ApiService();
		try {
			await api.get('https://httpbin.org/status/500');
		} catch (rejection) {
			expect(rejection).toBeInstanceOf(ApiError);
			expect(rejection.error).toBeInstanceOf(ky.HTTPError);
			expect(rejection.ok).toBe(false);
			expect(rejection.status).toBe(500);
			expect(rejection.text).toBe('');
		}
	});

	it('should handle an invalid domain', async () => {
		const api = new ApiService();
		try {
			await api.get('https://nobody-soup/abc');
		} catch (rejection) {
			expect(rejection).toBeInstanceOf(ApiError);
			expect(rejection.error).toBeInstanceOf(Error);
			expect(rejection.ok).toBe(false);
		}
	});

	it('should throw on bad protocols', async () => {
		const api = new ApiService();
		try {
			await api.get('abc://unvalid');
		} catch (error) {
			expect(error).toBeInstanceOf(TypeError);
		}
	});

	it('should reject timeouts', async () => {
		const api = new ApiService();
		try {
			await api.get('https://httpbin.org/delay/2', null, {
				timeout: 1000,
			});
		} catch (rejection) {
			expect(rejection).toBeInstanceOf(ApiError);
			expect(rejection.error).toBeInstanceOf(ky.TimeoutError);
			expect(rejection.ok).toBe(false);
		}
	});
});

describe('ApiService interceptors', () => {
	it('should accept a GET request interceptor with headers', async () => {
		expect.assertions(2);
		const api = new ApiService();
		const foobarHeader = (request, passedApi) => {
			expect(passedApi).toBe(api);
			request.headers['Foobar'] = 'baz';
		};
		api.addInterceptor({ request: foobarHeader });
		const response = await api.get('https://httpbin.org/get');
		expect(response.data.headers.Foobar).toEqual('baz');
	});

	it('should accept a GET request interceptor', async () => {
		const api = new ApiService();
		const incrementer = request => {
			request.params.a++;
		};
		api.addInterceptor({ request: incrementer });
		const response = await api.get('https://httpbin.org/get', { a: 1 });
		expect(response.request.params).toEqual({ a: 2 });
		expect(response.request.url).toEqual('https://httpbin.org/get?a=2');
		expect(response.data.args).toEqual({ a: '2' });
	});

	it('should accept a GET response interceptor', async () => {
		expect.assertions(2);
		const api = new ApiService();
		const incrementB = (request, response) => {
			expect(request.params.b).toBe('2');
			response.data.args.b++;
		};
		api.addInterceptor({ response: incrementB });
		const response = await api.get('https://httpbin.org/get', { b: 2 });
		expect(response.data.args.b).toBe(3);
	});

	it('should accept a POST request interceptor', async () => {
		const api = new ApiService();
		const incrementA = request => {
			request.data.a++;
		};
		api.addInterceptor({ request: incrementA });
		const response = await api.post('https://httpbin.org/post', { a: 1 });
		expect(response.data.json.a).toBe(2);
	});

	it('should accept a POST response interceptor', async () => {
		expect.assertions(2);
		const api = new ApiService();
		const incrementB = (request, response) => {
			expect(response.data.json.b).toBe(2);
			response.data.json.b++;
		};
		api.addInterceptor({ response: incrementB });
		const response = await api.post('https://httpbin.org/post', { b: 2 });
		expect(response.data.json.b).toBe(3);
	});

	it('should accept an error interceptor', async () => {
		expect.assertions(2);
		const api = new ApiService();
		let req, res;
		api.addInterceptor({
			error: (request, response) => {
				req = request;
				res = response;
			},
		});
		try {
			await api.get('https://httpbin.org/status/500');
		} catch (rejection) {
			expect(req).toBeInstanceOf(ApiRequest);
			expect(res).toBeInstanceOf(ApiError);
		}
	});
	// TODO: use fetchmock to trigger error handler for other error
	it('should accept an abort interceptor', done => {
		expect.assertions(2);
		const api = new ApiService();
		api.addInterceptor({
			abort: (request, response) => {
				expect(request).toBeInstanceOf(ApiRequest);
				expect(response).toBeInstanceOf(ApiError);
				done();
			},
		});
		const promise = api.get('https://httpbin.org/get?a=one');
		promise.catch(() => {});
		promise.abort();
	});
	it('should accept an timeout interceptor', done => {
		expect.assertions(2);
		const api = new ApiService();
		api.addInterceptor({
			timeout: (request, response) => {
				expect(request).toBeInstanceOf(ApiRequest);
				expect(response).toBeInstanceOf(ApiError);
				done();
			},
		});
		const promise = api.get('https://httpbin.org/delay/2', null, {
			timeout: 1000,
		});
		promise.catch(() => {});
	});
});

describe('ApiService abort() function', () => {
	it('should abort by abort() method', async () => {
		expect.assertions(3);
		const api = new ApiService();
		const promise = api.get('https://httpbin.org/get?a=1');
		expect(typeof promise.abort).toBe('function');
		promise.abort();
		try {
			await promise;
		} catch (rejection) {
			expect(rejection).toBeInstanceOf(ApiError);
			expect(rejection.error).toBeInstanceOf(Error);
		}
	});

	it('should abort none', async () => {
		expect.assertions(2);
		const api = new ApiService();
		const promise = api.get('https://httpbin.org/get?b=2');
		const numAborted = api.abort('POST');
		expect(numAborted).toBe(0);
		try {
			const res = await promise;
			expect(res).toBeInstanceOf(ApiResponse);
		} catch (e) {
			expect(true).toBe(false);
		}
	});

	it('should abort all', async () => {
		expect.assertions(2);
		const api = new ApiService();
		const promise = api.get('https://httpbin.org/get?c=3');
		const numAborted = api.abort();
		expect(numAborted).toBe(1);
		try {
			await promise;
			expect(true).toBe(false);
			done();
		} catch (rejection) {
			expect(rejection).toBeInstanceOf(ApiError);
		}
	});

	it('should abort by verb', done => {
		const api = new ApiService();
		let didResolve = false;
		let rejection;
		const promise = api.get('https://httpbin.org/get?d=4');
		promise.then(
			resp => {
				didResolve = true;
			},
			err => (rejection = err)
		);
		const numAborted = api.abort('GET');
		expect(numAborted).toBe(1);
		setTimeout(() => {
			expect(didResolve).toBe(false);
			expect(rejection).toBeInstanceOf(ApiError);
			done();
		}, 100);
	});

	it('should abort by verb and endpoint', done => {
		const api = new ApiService();
		let didResolve = false;
		let rejection;
		const promise = api.get('https://httpbin.org/get?e=5');
		promise.then(
			resp => {
				didResolve = true;
			},
			err => (rejection = err)
		);
		const numAborted = api.abort('GET', 'https://httpbin.org/get?e=5');
		expect(numAborted).toBe(1);
		setTimeout(() => {
			expect(didResolve).toBe(false);
			expect(rejection).toBeInstanceOf(ApiError);
			done();
		}, 100);
	});

	it('should abort by promise', done => {
		const api = new ApiService();
		let didResolve = false;
		let rejection;
		const promise = api.get('https://httpbin.org/get?f=6');
		promise.then(
			resp => {
				didResolve = true;
			},
			err => (rejection = err)
		);
		const numAborted = api.abort(promise);
		expect(numAborted).toBe(1);
		setTimeout(() => {
			expect(didResolve).toBe(false);
			expect(rejection).toBeInstanceOf(ApiError);
			done();
		}, 100);
	});
});

describe('ApiService caching', () => {
	it('should return same promise', () => {
		const api = new ApiService();
		const promise1 = api.get(
			'https://httpbin.org/get',
			{ c: 3 },
			{ cacheFor: '2s' }
		);
		const promise2 = api.get('https://httpbin.org/get', { c: 3 });
		expect(promise1).toBe(promise2);
	});
	it('should clear all cache', () => {
		const api = new ApiService();
		const promise1 = api.get(
			'https://httpbin.org/get',
			{ c: 3 },
			{ cacheFor: '1s' }
		);
		api.cache.clear();
		const promise2 = api.get('https://httpbin.org/get', { c: 3 });
		expect(promise1).not.toBe(promise2);
	});
	it('should clear cache by url', () => {
		const api = new ApiService();
		const promise1 = api.get('https://httpbin.org/get', null, {
			cacheFor: '1s',
		});
		api.cache.clear('get', 'https://httpbin.org/get');
		const promise2 = api.get('https://httpbin.org/get');
		expect(promise1).not.toBe(promise2);
	});
});
