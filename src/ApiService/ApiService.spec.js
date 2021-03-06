const ApiService = require('./ApiService.js');
const ApiRequest = require('../ApiRequest/ApiRequest.js');
const ApiResponse = require('../ApiResponse/ApiResponse.js');
const ApiError = require('../ApiError/ApiError.js');
const { TimeoutError, HTTPError } = require('../fetch/fetch.js');
const fetchMock = require('fetch-mock');

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
		expect(result).toEqual({
			diff: {},
			hasChanges: false,
			response: null,
		});
	});
});
describe('ApiService submitJob with fetchMock', () => {
	afterEach(() => fetchMock.reset());
	it('should respond properly', async done => {
		expect.assertions(3);
		fetchMock.post(/doStuff1/, {
			status: 202,
			body: {
				job_id: '123',
			},
		});
		fetchMock.get(/api_jobs\/123/, {
			status: 200,
			body: {
				completed_at: '2021-03-06 19:00:00',
				response_body: JSON.stringify({ foo: 'done' }),
			},
		});
		const api = new ApiService();
		const result = await api.submitJob('https://example.com/doStuff1', {
			a: 'one',
		});
		expect(result.request.headers['Submit-As-Job']).toBe('1');
		expect(result.wait).toBeInstanceOf(Function);
		result.wait({
			onComplete: response => {
				const data = JSON.parse(response.data.response_body);
				expect(data).toEqual({ foo: 'done' });
				done();
			},
			recheckInterval: 100,
		});
	});
	it('should stop waiting', async done => {
		expect.assertions(2);
		fetchMock.post(/doStuff2/, {
			status: 202,
			body: {
				job_id: '456',
			},
		});
		fetchMock.get(/api_jobs\/456/, {
			status: 200,
			body: {
				completed_at: '2021-03-06 19:03:00',
				response_body: JSON.stringify({ bar: 'ok' }),
			},
		});
		const api = new ApiService();
		const result = await api.submitJob('https://example.com/doStuff2', {
			b: 'two',
		});
		expect(result.stopWaiting).toBeInstanceOf(Function);
		result.wait({
			onComplete: () => {
				expect(true).toBe(false);
			},
			recheckInterval: 100,
		});
		setTimeout(() => {
			result.stopWaiting();
			expect(true).toBe(true);
			done();
		}, 50);
	});
	it('should timeout', async done => {
		expect.assertions(1);
		fetchMock.post(/doStuff3/, {
			status: 202,
			body: {
				job_id: '789',
			},
		});
		fetchMock.get(/api_jobs\/789/, {
			status: 200,
			body: {
				completed_at: null,
			},
		});
		const api = new ApiService();
		const result = await api.submitJob('https://example.com/doStuff3', {
			c: 'three',
		});
		result.wait({
			onComplete: () => {
				expect(true).toBe(false);
			},
			onTimeout: () => {
				expect(true).toBe(true);
				done();
			},
			recheckInterval: 200,
			timeout: 100,
		});
	});
	it('should handle non 202', async () => {
		fetchMock.post(/doStuff4/, {
			status: 200,
			body: {},
		});
		const api = new ApiService();
		const result = await api.submitJob('https://example.com/doStuff4', {
			d: 'four',
		});
		expect(result.status).toBe(200);
		expect(result.wait).toBeUndefined();
		expect(result.stopWaiting).toBeUndefined();
	});
	it('should error on 400', async () => {
		fetchMock.post(/doStuff5/, {
			status: 400,
			body: {},
		});
		const api = new ApiService();
		try {
			await api.submitJob('https://example.com/doStuff5', {
				e: 'five',
			});
		} catch (response) {
			expect(response.status).toBe(400);
			expect(response.wait).toBeUndefined();
			expect(response.stopWaiting).toBeUndefined();
		}
	});
});

describe('ApiService errors', () => {
	it('should handle an invalid domain', async () => {
		expect.assertions(5);
		const api = new ApiService();
		try {
			await api.get('https://nobody_soup/abc');
		} catch (rejection) {
			expect(rejection).toBeInstanceOf(ApiError);
			expect(rejection.error).toBeInstanceOf(Error);
			expect(rejection.ok).toBe(false);
			expect(rejection.message).toBe(
				'FetchError: request to https://nobody_soup/abc failed, reason: getaddrinfo ENOTFOUND nobody_soup'
			);
			expect(rejection.stack).toMatch(
				/getaddrinfo ENOTFOUND nobody_soup\n\s*at /
			);
		}
	});

	it('should throw on bad protocols', async () => {
		expect.assertions(1);
		const api = new ApiService();
		try {
			await api.get('abc://unvalid');
		} catch (error) {
			expect(error.constructor.name).toBe('TypeError');
		}
	});

	it('should reject on 400s', async () => {
		expect.assertions(2);
		const api = new ApiService();
		try {
			await api.get('https://httpbin.org/status/400');
		} catch (error) {
			expect(error.error.constructor.name).toBe('HTTPError');
			expect(error.message).toBe('HTTP 400 BAD REQUEST');
		}
	});

	it('should reject on 500s', async () => {
		expect.assertions(2);
		const api = new ApiService();
		try {
			await api.get('https://httpbin.org/status/500');
		} catch (error) {
			expect(error.error.constructor.name).toBe('HTTPError');
			expect(error.message).toBe('HTTP 500 INTERNAL SERVER ERROR');
		}
	});

	it('should reject timeouts', async () => {
		expect.assertions(5);
		const api = new ApiService();
		try {
			await api.get('https://httpbin.org/delay/1', null, {
				timeout: 100,
			});
		} catch (rejection) {
			expect(rejection).toBeInstanceOf(ApiError);
			expect(rejection.error).toBeInstanceOf(TimeoutError);
			expect(rejection.ok).toBe(false);
			expect(rejection.message).toBe('TimeoutError: Request timed out');
			expect(rejection.stack).toMatch(/Request timed out\n\s*at /);
		}
	});

	it('should interpret 0 timeout as infinite', async () => {
		const api = new ApiService();
		const response = await api.get('https://httpbin.org/delay/1', null, {
			timeout: 0,
		});
		expect(response.status).toBe(200);
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
			expect(request.params.b).toBe(2);
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
		expect.assertions(3);
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
			expect(rejection.error).toBeInstanceOf(HTTPError);
		}
	});

	it('should accept an error interceptor for bad URLs', async () => {
		expect.assertions(3);
		const api = new ApiService();
		let req, res;
		api.addInterceptor({
			error: (request, response) => {
				req = request;
				res = response;
			},
		});
		try {
			await api.get('https://foo * bar');
		} catch (rejection) {
			expect(req).toBeInstanceOf(ApiRequest);
			expect(res).toBeInstanceOf(ApiError);
			expect(rejection.error).toBeInstanceOf(Error);
		}
	});
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
		expect.assertions(4);
		const api = new ApiService();
		const promise = api.get('https://httpbin.org/get?a=1');
		expect(typeof promise.abort).toBe('function');
		promise.abort();
		try {
			await promise;
		} catch (rejection) {
			expect(rejection).toBeInstanceOf(ApiError);
			expect(rejection.wasAborted).toBe(true);
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

	it('should abort by verb RegExp', done => {
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
		const numAborted = api.abort(/get/i);
		expect(numAborted).toBe(1);
		setTimeout(() => {
			expect(didResolve).toBe(false);
			expect(rejection).toBeInstanceOf(ApiError);
			done();
		}, 100);
	});

	it('should abort by endpoint RegExp', done => {
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
		const numAborted = api.abort(null, /httpbin/);
		expect(numAborted).toBe(1);
		setTimeout(() => {
			expect(didResolve).toBe(false);
			expect(rejection).toBeInstanceOf(ApiError);
			done();
		}, 100);
	});

	it('should abort by string verb and endpoint RegExp', done => {
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
		const numAborted = api.abort('GET', /httpbin/);
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
		const numAborted = api.abort('GET', 'https://httpbin.org/get');
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

	it('should return 0 when abort promise is not found', () => {
		const api = new ApiService();
		const numAborted = api.abort(Promise.resolve('foo'));
		expect(numAborted).toBe(0);
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

describe('ApiService default options', () => {
	it('should accept options upon instantiation', async () => {
		const api = new ApiService({ headers: { Authentication: 'Bearer 123' } });
		const resp = await api.get('https://httpbin.org/get');
		expect(resp.data.headers.Authentication).toBe('Bearer 123');
	});
	it('should accept options at setDefaultOptions', async () => {
		const api = new ApiService();
		api.setDefaultOptions({ headers: { Authentication: 'Bearer 456' } });
		const resp = await api.get('https://httpbin.org/get');
		expect(resp.data.headers.Authentication).toBe('Bearer 456');
	});
	it('should add options at addDefaultOptions', async () => {
		const api = new ApiService();
		api.addDefaultOptions({ headers: { Authentication: 'Bearer 789' } });
		const resp = await api.get('https://httpbin.org/get');
		expect(resp.data.headers.Authentication).toBe('Bearer 789');
	});
	it('should get options that were set', () => {
		const api = new ApiService();
		api.addDefaultOptions({ headers: { Authentication: 'Bearer 010' } });
		const opt = api.getDefaultOptions();
		expect(opt.headers.Authentication).toBe('Bearer 010');
	});
	it('should get and set baseURL', () => {
		const api = new ApiService();
		api.setBaseURL('https://example.com/api');
		const opt = api.getDefaultOptions();
		expect(opt.baseURL).toBe('https://example.com/api');
	});
	it('should set baseURL', () => {
		const api = new ApiService();
		api.setBaseURL('https://example.com/api');
		const base = api.getBaseURL();
		expect(base).toBe('https://example.com/api');
	});
});

describe('ApiService debugging', () => {
	it('should debug successful responses', async () => {
		const api = new ApiService();
		const response = await api.post(
			'https://httpbin.org/status/204',
			{ foo: 'bar' },
			{
				headers: {
					Baz: 'Qux',
				},
			}
		);
		expect(response.debug()).toMatchSnapshot({
			headers: { date: expect.any(String), server: expect.any(String) },
		});
	});
	it('should debug error responses', async () => {
		expect.assertions(1);
		const api = new ApiService();
		try {
			await api.get(
				'https://httpbin.org/status/500',
				{ a: '1' },
				{ headers: { b: '2' } }
			);
		} catch (rejection) {
			expect(rejection.debug()).toMatchSnapshot({
				headers: {
					date: expect.any(String),
					server: expect.any(String),
				},
			});
		}
	});
});

describe('ApiRequest debugging', () => {
	it('should debug successful responses', async () => {
		expect.assertions(1);
		const api = new ApiService();
		api.addInterceptor({
			response: request => {
				expect(request.debug()).toMatchSnapshot({
					response: {
						data: {
							headers: {
								'User-Agent': expect.any(String),
								'X-Amzn-Trace-Id': expect.any(String),
							},
							origin: expect.any(String),
						},
						headers: {
							date: expect.any(String),
							server: expect.any(String),
							'content-length': expect.any(String),
						},
					},
				});
			},
		});
		await api.get(
			'https://httpbin.org/get',
			{ foo: 'bar' },
			{
				headers: {
					Baz: 'Qux',
				},
			}
		);
	});
	it('should debug error responses', async () => {
		expect.assertions(1);
		const api = new ApiService();
		api.addInterceptor({
			error: request => {
				expect(request.debug()).toMatchSnapshot({
					response: {
						headers: {
							date: expect.any(String),
							server: expect.any(String),
						},
					},
				});
			},
		});
		try {
			await api.get(
				'https://httpbin.org/status/400',
				{ foo: 'bar' },
				{
					headers: {
						Baz: 'Qux',
					},
				}
			);
		} catch (e) {}
	});
});
