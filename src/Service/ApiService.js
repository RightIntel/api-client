const isEqual = require('lodash/isEqual');
const isPromise = require('is-promise');
const isEmpty = require('lodash/isEmpty');
const ApiError = require('../Error/ApiError.js');
const ApiResponse = require('../Response/ApiResponse.js');
let ky;
if (typeof process !== 'undefined') {
	// node/jest using shimmed fetch()
	ky = require('ky-universal');
} else {
	// browser using native fetch()
	ky = require('ky');
	if (typeof ky !== 'function') {
		ky = ky.default;
	}
}
const TimeoutError = ky.TimeoutError;
const HTTPError = ky.HTTPError;

class ApiService {
	/**
	 * Setup values we need
	 */
	constructor() {
		/**
		 * Object to track previous requests
		 * @type {Object}
		 * @private
		 */
		this.cache = {};
		/**
		 * Arrays of registered interceptors
		 * @type {{request: [], abort: [], response: [], error: [], timeout: []}}
		 * @private
		 */
		this.interceptors = {
			request: [],
			response: [],
			error: [],
			abort: [],
			timeout: [],
		};
		/**
		 * Array of cancelation tokens to abort in-process requests
		 * @type {Array}
		 * @private
		 */
		this.cancelTokens = [];
	}

	/**
	 * Add an interceptor for various events
	 * @param {Object} definition
	 * @property {Function} [request]  Allows altering requests before they are sent
	 * @property {Function} [response]  Allows altering responses
	 * @property {Function} [error]  Allows catching and altering errors
	 * @property {Function} [timeouts]  Allows catching and altering timeout responses
	 * @property {Function} [abort]  Allows catching and altering aborted responses
	 * @returns {ApiService}
	 */
	addInterceptor(definition) {
		if (definition.request) {
			this.interceptors.request.push(definition.request);
		}
		if (definition.response) {
			this.interceptors.response.push(definition.response);
		}
		if (definition.error) {
			this.interceptors.error.push(definition.error);
		}
		if (definition.abort) {
			this.interceptors.abort.push(definition.abort);
		}
		if (definition.timeout) {
			this.interceptors.timeout.push(definition.timeout);
		}
		return this;
	}

	/**
	 * Abort all requests matching the given values
	 * @param methodOrPromise
	 * @param [endpoint]
	 * @returns {Number}  The number of requests that were canceled
	 */
	abort(methodOrPromise = null, endpoint = null) {
		if (isPromise(methodOrPromise)) {
			// cancel a specific request
			const promise = methodOrPromise;
			for (const token of this.cancelTokens) {
				if (token.promise === promise) {
					token.controller.abort();
				}
				return 1;
			}
			return 0;
		}
		const method = (methodOrPromise || '').toUpperCase();
		let matcher;
		if (method && endpoint) {
			// cancel all requests matching this verb and endpoint
			matcher = token => method === token.method && endpoint === token.endpoint;
		} else if (method) {
			// cancel all requests with this verb
			matcher = token => method === token.method;
		} else if (endpoint) {
			// cancel all requests to this endpoint
			matcher = token => endpoint === token.endpoint;
		} else {
			// cancel all requests
			matcher = () => true;
		}
		const matching = this.cancelTokens.filter(matcher);
		matching.forEach(token => token.controller.abort());
		return matching.length;
	}

	/**
	 * Build a URL from the given endpoint
	 * @param {String} endpoint  The Sharpr API endpoint such as /posts/123
	 * @return {String}  A URL suitable for fetch
	 */
	getUrl(endpoint) {
		// URL is already a full URL
		if (/^https?:\/\//i.test(endpoint)) {
			return endpoint;
		}
		const match = (endpoint || '').match(/^:?\/\/(.+)/);
		if (match) {
			return `http://${match[1]}`;
		}
		// construct using api base url
		let version = 'v2';
		endpoint = endpoint.replace(/^(?:\/?api)?\/(v\d+)\//, ($0, $1) => {
			version = $1;
			return '/';
		});
		return `/api/${version}${endpoint}`;
	}

	/**
	 * Convert object to search param string (parameters are alphabetized)
	 * Note: there is no special handling for nested objects or arrays
	 * @param {Object} object  The search param object to serialize
	 * @returns {String}
	 */
	getQueryString(params) {
		const searchParams = new URLSearchParams(params);
		searchParams.sort();
		const searchString = searchParams.toString();
		if (searchString) {
			return '?' + searchString.replace(/\+/g, '%20');
		}
		return '';
	}

	/**
	 * Make an HTTP request
	 * @param {String} method  GET, POST, DELETE, etc.
	 * @param {String} endpoint  The name of the API endpoint such as /posts/123
	 * @param {Object} [paramsOrData]  For GET requests, the query params; otherwise JSON payload
	 * @param {Object} [kyOverrides]  Additional overrides including headers
	 * @return {Promise<ApiResponse | ApiError>}
	 */
	request(method, endpoint, paramsOrData = {}, kyOverrides = {}) {
		// ensure method is upper case
		method = method.toUpperCase();
		// ensure we have at least empty headers for our interceptors to work with
		if (!kyOverrides.headers) {
			kyOverrides.headers = {};
		}
		// construct URL
		let json, searchParams;
		let url = this.getUrl(endpoint);
		// get URL params or payload
		// see https://github.com/sindresorhus/ky#api
		if (method === 'GET') {
			if (!isEmpty(paramsOrData)) {
				searchParams = paramsOrData;
			}
		} else {
			json = paramsOrData;
		}
		let cacheKey;
		// return cached promise if available
		if (kyOverrides.cacheFor) {
			cacheKey = this.getCacheKey(method, url, searchParams);
			if (this.cache[cacheKey]) {
				return this.cache[cacheKey];
			}
		}
		// handle cancellation
		const controller = new AbortController();
		const { signal } = controller;
		const cancelToken = { method, endpoint, controller };
		this.cancelTokens.push(cancelToken);
		const discardCancelToken = () => {
			this.cancelTokens = this.cancelTokens.filter(
				token => token.controller === controller
			);
		};
		// disable retry
		const retry = { limit: 0 };
		// non 2xx codes should go into the promise rejection
		const throwHttpErrors = true;
		// timeout after 5 minutes
		const timeout = 5 * 60 * 1000;
		// all params
		const request = {
			// we add this URL so that interceptors can alter the URL
			url,
			// see https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax
			method,
			signal,
			retry,
			timeout,
			// see https://github.com/sindresorhus/ky#api
			json,
			searchParams,
			throwHttpErrors,
			// additional items like header and any values to override the above
			...kyOverrides,
		};
		this.interceptors.request.forEach(interceptor => {
			interceptor({
				endpoint,
				request,
				abortController: controller,
				api: this,
			});
		});
		// initiate request
		const kyPromise = ky(request.url, request);
		kyPromise.then(discardCancelToken, discardCancelToken);
		const promise = kyPromise.then(
			this._getSuccessHandler(endpoint, request),
			this._getErrorHandler(endpoint, request)
		);
		promise.finally(() => {
			promise.abort = () => {};
		});
		cancelToken.promise = promise;
		promise.abort = () => controller.abort();
		// populate cache if specified
		if (kyOverrides.cacheFor) {
			this.cache[cacheKey] = promise;
			setTimeout(() => {
				this.cache[cacheKey] = undefined;
			}, this.getCacheSeconds(kyOverrides.cacheFor) * 1000);
		}
		return promise;
	}

	/**
	 * Given method, url and params, get a string key for caching this request
	 * @param {String} method  The HTTP Verb such as GET, POST
	 * @param {String} url  The request URL
	 * @param {Object} params  The GET parameters as an object
	 * @returns {String}
	 */
	getCacheKey(method, url, params) {
		if (!isEmpty(params)) {
			url += '?' + this.getQueryString(params);
		}
		return `${method} ${url}`;
	}

	/**
	 * Given a cacheFor number or string, return the number of seconds to cache for
	 * @param {Number|String} cacheFor  Number of seconds or a string such as 45s, 5m, 8h, 1d
	 * @returns {Number}
	 */
	getCacheSeconds(cacheFor) {
		if (typeof cacheFor === 'number') {
			return cacheFor;
		}
		const match = cacheFor.match(
			/^([\d.]+) ?(?:(days?|d)|(hours?|hr|h)|(minutes?|min|m)|(seconds?|sec|s))$/i
		);
		if (!match) {
			throw new Error(
				`Unknown cacheFor value "${cacheFor}". Expecting a number of seconds or a string with units`
			);
		}
		const [, number, day, hr, min] = match;
		let seconds = parseFloat(number);
		seconds *= min ? 60 : 1;
		seconds *= hr ? 60 * 60 : 1;
		seconds *= day ? 60 * 60 * 24 : 1;
		return seconds;
	}

	/**
	 * Get a function to call on promise resolution
	 * @param {String} endpoint  The endpoint or URL
	 * @param {Object} request  The request object
	 * @returns {function(*=): ApiResponse}
	 * @private
	 */
	_getSuccessHandler(endpoint, request) {
		return async response => {
			const { type, data, text } = await this._readResponseData(response);
			const apiResponse = new ApiResponse({
				endpoint,
				request,
				response,
				type,
				data,
				text,
			});
			this.interceptors.response.forEach(interceptor => {
				interceptor({ endpoint, request, response: apiResponse, api: this });
			});
			return apiResponse;
		};
	}

	/**
	 * Get a handler for promise rejection for the given endpoint and request
	 * @param {String} endpoint  The endpoint or URL
	 * @param {Object} request  The request object
	 * @returns {Function}
	 * @private
	 */
	_getErrorHandler(endpoint, request) {
		return error => {
			if (error.type === 'aborted') {
				// console.log('*********handling abort!:', error);
				// aborted by the user
				return Promise.reject(this._handleAborted(error, endpoint, request));
			} else if (error instanceof HTTPError) {
				// console.log('*********handling error!:', error);
				// a non 2xx status code
				return this._handleHttpError(error, endpoint, request).then(
					apiError => Promise.reject(apiError),
					shouldNeverHappen => shouldNeverHappen
				);
			} else if (error instanceof TimeoutError) {
				// endpoint took too long to return
				return Promise.reject(this._handleTimeout(error, endpoint, request));
			} else if (
				error instanceof TypeError ||
				error instanceof ReferenceError
			) {
				throw error;
			}
			return Promise.reject(this._handleOtherError(error, endpoint, request));
		};
	}

	/**
	 * Handle a response from an HTTP Error
	 * @param {Error} error  The JavaScript Error object
	 * @param {String} endpoint  The endpoint or URL
	 * @param {Object} request  The request object
	 * @returns {ApiError}
	 * @private
	 */
	async _handleHttpError(error, endpoint, request) {
		const { type, data, text } = await this._readResponseData(error.response);
		const apiError = new ApiError({
			error,
			endpoint,
			request,
			response: error.response,
			type,
			data,
			text,
		});
		this.interceptors.error.forEach(interceptor => {
			interceptor({ error, endpoint, request, response: apiError, api: this });
		});
		return apiError;
	}

	/**
	 * Handle a response from an HTTP timeout
	 * @param {Error} error  The JavaScript Error object
	 * @param {String} endpoint  The endpoint or URL
	 * @param {Object} request  The request object
	 * @returns {ApiError}
	 * @private
	 */
	_handleTimeout(error, endpoint, request) {
		error.type = 'timeout';
		const apiError = new ApiError({ error, endpoint, request });
		this.interceptors.timeout.forEach(interceptor => {
			interceptor({ error, endpoint, request, response: apiError, api: this });
		});
		return apiError;
	}

	/**
	 * Handle a response from a user-triggered abort
	 * @param {Error} error  The JavaScript Error object
	 * @param {String} endpoint  The endpoint or URL
	 * @param {Object} request  The request object
	 * @returns {ApiError}
	 * @private
	 */
	_handleAborted(error, endpoint, request) {
		// AbortError { type: 'aborted', message: 'The user aborted a request.' }
		const apiError = new ApiError({ error, endpoint, request });
		this.interceptors.abort.forEach(interceptor => {
			interceptor({ error, endpoint, request, response: apiError, api: this });
		});
		return apiError;
	}

	/**
	 * Handle a response from an other error (e.g. invalid URL)
	 * @param {Error} error  The JavaScript Error object
	 * @param {String} endpoint  The endpoint or URL
	 * @param {Object} request  The request object
	 * @returns {ApiError}
	 * @private
	 */
	_handleOtherError(error, endpoint, request) {
		// FetchError { 'messsage': 'request to ... failed, reason: getaddrinfo ENOTFOUND ...' }
		const apiError = new ApiError({ error, endpoint, request });
		this.interceptors.error.forEach(interceptor => {
			interceptor({ error, endpoint, request, response: apiError, api: this });
		});
		return apiError;
	}

	/**
	 * Given a fetch Response, get the json response or plain text
	 * @param response
	 * @returns {Promise<{data: null, text: null, type: null}|{data: *, text: *, type: *}>}
	 * @property {String|null}  The type of response (json, text, or null)
	 * @property {*} data  The json data response
	 * @property {String|null} text  The plain text response if valid json is not present
	 * @private
	 */
	async _readResponseData(response) {
		if (!response) {
			return { type: null, data: null, text: null };
		}
		let result;
		let type = (response.headers.get('Content-Type') || '').startsWith(
			'application/json'
		)
			? 'json'
			: 'text';
		try {
			result = await response[type]();
		} catch (e) {
			if (type === 'json') {
				try {
					type = 'text';
					result = await response.text();
				} catch (e) {
					// we can't read the response body
					type = null;
				}
			}
		}
		let data = null;
		let text = null;
		if (type === 'json') {
			data = result;
		} else if (type === 'text') {
			text = result;
		}
		return { type, data, text };
	}

	/**
	 * Clear one or all cache entries
	 * @param {String} [url]  The URL to clear cache; if falsy, clear all cache
	 * @returns {ApiService}
	 */
	clearCache(url = undefined) {
		if (url) {
			this.cache[url] = false;
		} else {
			this.cache = {};
		}
		return this;
	}

	/**
	 * Make a GET request to the specified endpoint
	 * @param {String} endpoint  The endpoint such as "/posts/123"
	 * @param {Object} [params]  Parameters to send in the query string
	 * @param {Object} [kyOverrides]  Values to override ky request
	 * @returns {Promise}  Resolves with the ApiResponse and rejects with ApiError
	 */
	get(endpoint, params = {}, kyOverrides = {}) {
		return this.request('get', endpoint, params, kyOverrides);
	}

	/**
	 * Make a HEAD request to the specified endpoint
	 * @param {String} endpoint  The endpoint such as "/posts/123"
	 * @param {Object} [params]  Parameters to send in the query string
	 * @param {Object} [kyOverrides]  Values to override ky request
	 * @returns {Promise}  Resolves with the ApiResponse and rejects with ApiError
	 */
	head(endpoint, params = {}, kyOverrides = {}) {
		return this.request('head', endpoint, params, kyOverrides);
	}

	/**
	 * Make a POST request to the specified endpoint
	 * @param {String} endpoint  The endpoint such as "/posts"
	 * @param {Object} [payload]  Data to send in the post body
	 * @param {Object} [kyOverrides]  Values to override ky request
	 * @returns {Promise}  Resolves with the ApiResponse and rejects with ApiError
	 */
	post(endpoint, payload = {}, kyOverrides = {}) {
		return this.request('post', endpoint, payload, kyOverrides);
	}

	/**
	 * Make a PUT request to the specified endpoint
	 * @param {String} endpoint  The endpoint such as "/posts/123/keywords"
	 * @param {Object} [payload]  Data to send in the post body
	 * @param {Object} [kyOverrides]  Values to override ky request
	 * @returns {Promise}  Resolves with the ApiResponse and rejects with ApiError
	 */
	put(endpoint, payload = {}, kyOverrides = {}) {
		return this.request('put', endpoint, payload, kyOverrides);
	}

	/**
	 * Make a PATCH request to the specified endpoint
	 * @param {String} endpoint  The endpoint such as "/posts/123"
	 * @param {Object} [payload]  Parameters to send in the patch payload
	 * @param {Object} [kyOverrides]  Values to override ky request
	 * @returns {Promise}  Resolves with the ApiResponse and rejects with ApiError
	 */
	patch(endpoint, payload = {}, kyOverrides = {}) {
		return this.request('patch', endpoint, payload, kyOverrides);
	}

	/**
	 * Make a DELETE request to the specified endpoint
	 * @param {String} endpoint  The endpoint such as "/posts/123"
	 * @param {Object} [payload]  Parameters to send in the delete payload
	 * @param {Object} [kyOverrides]  Values to override ky request
	 * @returns {Promise}  Resolves with the ApiResponse and rejects with ApiError
	 */
	delete(endpoint, payload = {}, kyOverrides = {}) {
		return this.request('delete', endpoint, payload, kyOverrides);
	}

	/**
	 * Examine two objects and execute a PATCH request on the differences
	 * @param {String} endpoint  The endpoint such as "/posts/123"
	 * @param {Object} oldValues  Values before
	 * @param {Object} newValues
	 * @param {Object} [kyOverrides]  Values to override ky request
	 * @returns {Promise}  Resolves with null if no change is needed
	 *     or else the ApiResponse and rejects with ApiError
	 */
	patchDifference(endpoint, oldValues, newValues, kyOverrides = {}) {
		const diff = {};
		for (const prop of newValues) {
			if (!newValues.hasOwnProperty(prop)) {
				continue;
			}
			if (!isEqual(newValues[prop], oldValues[prop])) {
				diff[prop] = newValues[prop];
			}
		}
		if (isEmpty(diff)) {
			return Promise.resolve(null);
		}
		return this.request('PATCH', endpoint, diff, kyOverrides);
	}

	/**
	 * Submit a job for processing and provide a callback mechanism
	 * to be notified when the job is complete
	 * @param {String} endpoint  The endpoint such as "/posts/123"
	 * @param {Object} [payload]  Parameters to send in the delete payload
	 * @param {Object} [kyOverrides]  Values to override ky request
	 * @returns {Promise}  Resolves with the ApiResponse and rejects with ApiError
	 * The ApiResponse will have an extra method onJobComplete:
	 * 		ApiResponse#onJobComplete(
	 * 			{Function} callback, // handler to call when job is complete
	 * 			{Number} [recheckIntervalMs=5000], // interval to recheck completion status
	 * 			{Number} [timeout=1800000] // milliseconds after which to give up
	 * 		);
	 */
	submitJob(endpoint, payload = {}, kyOverrides = {}) {
		if (!kyOverrides.headers) {
			kyOverrides.headers = {};
		}
		kyOverrides.headers['Submit-As-Job'] = '1';
		return this.post(endpoint, payload, kyOverrides).then(
			response => {
				if (response.status === 202) {
					const jobId = response.data.job_id;
					const start = +new Date();
					let timer;
					response.onJobComplete = (
						callback,
						recheckIntervalMs = 5000,
						timeout = 30 * 60 * 1000
					) => {
						timer = setInterval(() => {
							this.get(`/api_jobs/${jobId}`, { uuid: jobId }).then(data => {
								if (data.completed_at) {
									clearInterval(timer);
									callback(data);
								} else {
									checkTimeout();
								}
							}, checkTimeout);
						}, recheckIntervalMs);
						function checkTimeout() {
							const totalTime = +new Date() - start;
							if (totalTime > timeout) {
								clearInterval(timer);
								console.warn(
									`Stopped checking API job status after ${timeout} milliseconds`
								);
							}
						}
					};
					response.stopWaiting = () => {
						clearInterval(timer);
					};
				}
			},
			error => error
		);
	}
}

module.exports = ApiService;
