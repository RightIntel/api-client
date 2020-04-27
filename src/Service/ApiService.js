const isEqual = require('lodash/isEqual');
const isPromise = require('is-promise');
const isEmpty = require('lodash/isEmpty');
const ApiError = require('../Error/ApiError.js');
const ApiResponse = require('../Response/ApiResponse.js');
const ApiCache = require('../Cache/ApiCache.js');

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
		this.cache = new ApiCache();
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
		 * Array of ApiRequest objects to allow aborting in-process requests
		 * @type {Array}
		 * @private
		 */
		this.pendingRequests = [];
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
			for (const token of this.outstandingRequests) {
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
	 * Make an HTTP request
	 * @param {String} method  GET, POST, DELETE, etc.
	 * @param {String} endpoint  The name of the API endpoint such as /posts/123
	 * @param {Object} [paramsOrData]  For GET requests, the query params; otherwise JSON payload
	 * @param {Object} [kyOverrides]  Additional overrides including headers
	 * @return {Promise<ApiResponse | ApiError>}
	 */
	request(method, endpoint, paramsOrData = {}, kyOverrides = {}) {
		let params, data;
		if (/^get$/i.test(method)) {
			params = paramsOrData;
		} else {
			data = paramsOrData;
		}
		const request = new ApiRequest(method, endpoint, params, data, kyOverrides);
		// return cached promise if available
		let cached = this.cache.find(request);
		if (cached) {
			return cached.promise;
		}
		this.pendingRequests.push(request);
		this.interceptors.request.forEach(interceptor => {
			interceptor(request, this);
		});
		const removePending = () => {
			const idx = this.pendingRequests.indexOf(request);
			if (idx > -1) {
				this.pendingRequests.splice(idx, 1);
			}
		};
		const kyPromise = request.send();
		kyPromise.then(removePending, removePending);
		const promise = kyPromise.then(
			this._getSuccessHandler(request),
			this._getErrorHandler(request)
		);
		promise.abort = () => request.abort();
		if (request.options.cacheFor) {
			this.cache.add(request);
		}
		return promise;

		// // ensure method is upper case
		// method = method.toUpperCase();
		// // ensure we have at least empty headers for our interceptors to work with
		// if (!kyOverrides.headers) {
		// 	kyOverrides.headers = {};
		// }
		// // construct URL
		// let json, searchParams;
		// let url = this.getUrl(endpoint);
		// // get URL params or payload
		// // see https://github.com/sindresorhus/ky#api
		// if (method === 'GET') {
		// 	if (!isEmpty(paramsOrData)) {
		// 		searchParams = paramsOrData;
		// 	}
		// } else {
		// 	json = paramsOrData;
		// }
		// // return cached promise if available
		// let cached = this.cache.find(method, url, searchParams);
		// if (cached) {
		// 	return cached.promise;
		// }
		// handle cancellation
		// const controller = new AbortController();
		// const { signal } = controller;
		// const cancelToken = { method, endpoint, controller };
		// this.cancelTokens.push(cancelToken);
		// const discardCancelToken = () => {
		// 	this.cancelTokens = this.cancelTokens.filter(
		// 		token => token.controller === controller
		// 	);
		// };
		// // disable retry
		// const retry = { limit: 0 };
		// // non 2xx codes should go into the promise rejection
		// const throwHttpErrors = true;
		// // timeout after 5 minutes
		// const timeout = 5 * 60 * 1000;
		// // all params
		// const request = {
		// 	// we add this URL so that interceptors can alter the URL
		// 	url,
		// 	// see https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch#Syntax
		// 	method,
		// 	signal,
		// 	retry,
		// 	timeout,
		// 	// see https://github.com/sindresorhus/ky#api
		// 	json,
		// 	searchParams,
		// 	throwHttpErrors,
		// 	// additional items like header and any values to override the above
		// 	...kyOverrides,
		// };
		// this.interceptors.request.forEach(interceptor => {
		// 	interceptor({
		// 		endpoint,
		// 		request,
		// 		abortController: controller,
		// 		api: this,
		// 	});
		// });
		// initiate request
		// const kyPromise = ky(request.url, request);
		// kyPromise.then(discardCancelToken, discardCancelToken);
		// const promise = kyPromise.then(
		// 	this._getSuccessHandler(endpoint, request),
		// 	this._getErrorHandler(endpoint, request)
		// );
		// promise.finally(() => {
		// 	promise.abort = () => {};
		// });
		// cancelToken.promise = promise;
		// promise.abort = () => controller.abort();
		// populate cache if specified
		// if (kyOverrides.cacheFor) {
		// 	this.cache.add(promise, method, url, searchParams, kyOverrides.cacheFor);
		// }
		// return promise;
	}

	/**
	 * Get a function to call on promise resolution
	 * @param {ApiRequest} request  The request object
	 * @returns {function(*=): ApiResponse}
	 * @private
	 */
	_getSuccessHandler(request) {
		return async rawResponse => {
			const { type, data, text } = await this._readResponseData(rawResponse);
			const response = new ApiResponse({
				request,
				response: rawResponse,
				type,
				data,
				text,
			});
			this.interceptors.response.forEach(interceptor => {
				interceptor(request, response, this);
			});
			return response;
		};
	}

	/**
	 * Get a handler for promise rejection for the given endpoint and request
	 * @param {ApiRequest} request  The request object
	 * @returns {Function}
	 * @private
	 */
	_getErrorHandler(request) {
		return error => {
			if (error.type === 'aborted') {
				// console.log('*********handling abort!:', error);
				// aborted by the user
				return Promise.reject(this._handleAborted(request, error));
			} else if (error instanceof global.HTTPError) {
				// console.log('*********handling error!:', error);
				// a non 2xx status code
				return this._handleHttpError(request, error).then(
					apiError => Promise.reject(apiError),
					shouldNeverHappen => shouldNeverHappen
				);
			} else if (error instanceof global.TimeoutError) {
				// endpoint took too long to return
				return Promise.reject(this._handleTimeout(request, error));
			} else if (
				error instanceof TypeError ||
				error instanceof ReferenceError
			) {
				throw error;
			}
			return Promise.reject(this._handleOtherError(request, error));
		};
	}

	/**
	 * Handle a response from an HTTP Error
	 * @param {ApiRequest} request  The request object
	 * @param {Error} error  The JavaScript Error object
	 * @returns {ApiError}
	 * @private
	 */
	async _handleHttpError(request, error) {
		const { type, data, text } = await this._readResponseData(error.response);
		const response = new ApiError({
			error,
			request,
			response: error.response,
			type,
			data,
			text,
		});
		this.interceptors.error.forEach(interceptor => {
			interceptor(request, response, this);
		});
		return response;
	}

	/**
	 * Handle a response from an HTTP timeout
	 * @param {ApiRequest} request  The request object
	 * @param {Error} error  The JavaScript Error object
	 * @returns {ApiError}
	 * @private
	 */
	_handleTimeout(request, error) {
		error.type = 'timeout';
		const response = new ApiError(request, error);
		this.interceptors.timeout.forEach(interceptor => {
			interceptor(request, response, this);
		});
		return response;
	}

	/**
	 * Handle a response from a user-triggered abort
	 * @param {ApiRequest} request  The request object
	 * @param {String} endpoint  The endpoint or URL
	 * @returns {ApiError}
	 * @private
	 */
	_handleAborted(request, error) {
		// AbortError { type: 'aborted', message: 'The user aborted a request.' }
		const response = new ApiError(request, error);
		this.interceptors.abort.forEach(interceptor => {
			interceptor(request, response, this);
		});
		return response;
	}

	/**
	 * Handle a response from an other error (e.g. invalid URL)
	 * @param {ApiRequest} request  The request object
	 * @param {Error} error  The JavaScript Error object
	 * @returns {ApiError}
	 * @private
	 */
	_handleOtherError(request, error) {
		// FetchError { 'messsage': 'request to ... failed, reason: getaddrinfo ENOTFOUND ...' }
		const response = new ApiError(request, error);
		this.interceptors.error.forEach(interceptor => {
			interceptor(request, response, this);
		});
		return response;
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
