const isEqual = require('lodash/isEqual');
const equalsOrMatches = require('../equalsOrMatches/equalsOrMatches.js');
const isPromise = require('is-promise');
const ApiError = require('../ApiError/ApiError.js');
const ApiRequest = require('../ApiRequest/ApiRequest.js');
const ApiCache = require('../ApiCache/ApiCache.js');
const ApiResponse = require('../ApiResponse/ApiResponse.js');
const ky = require('../ky/ky.js');

class ApiService {
	/**
	 * Set up cache, interceptor list, pending requests and default options
	 * @param {Object} defaultOptions  Any options to use for every request
	 */
	constructor(defaultOptions = {}) {
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
		/**
		 * Object with options to use for every request
		 * @type {Object}
		 * @private
		 */
		this._defaultOptions = defaultOptions;
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
	 * @param {String|Promise|RegExp} methodOrPromise  The HTTP verb or a single promise
	 * @param {String|RegExp} [endpoint]  An endpoint name, URL or RegExp
	 * @returns {Number}  The number of requests that were canceled
	 */
	abort(methodOrPromise = null, endpoint = null) {
		if (isPromise(methodOrPromise)) {
			// cancel a specific request
			const promise = methodOrPromise;
			for (const item of this.pendingRequests) {
				if (item.promise === promise) {
					item.request.abort();
				}
				return 1;
			}
			return 0;
		}
		const method = (methodOrPromise || '').toUpperCase();
		let matcher;
		if (method && endpoint) {
			// cancel all requests matching this verb and endpoint
			matcher = item =>
				equalsOrMatches(item.request.method, method) &&
				equalsOrMatches(item.request.endpoint, endpoint);
		} else if (method) {
			// cancel all requests with this verb
			matcher = item => equalsOrMatches(item.request.method, method);
		} else if (endpoint) {
			// cancel all requests to this endpoint
			matcher = item => equalsOrMatches(item.request.endpoint, endpoint);
		} else {
			// cancel all requests
			matcher = () => true;
		}
		const matching = this.pendingRequests.filter(matcher);
		matching.forEach(item => item.request.abort());
		return matching.length;
	}

	/**
	 * Set the options to use for every request
	 * @param {Object} defaultOptions  Any options to use for every request
	 * @returns {ApiService}
	 */
	setDefaultOptions(defaultOptions = {}) {
		this._defaultOptions = defaultOptions;
		return this;
	}

	/**
	 * Get the options to use for every request
	 * @returns {Object}
	 */
	getDefaultOptions() {
		return this._defaultOptions;
	}

	/**
	 * Add more options to use for every request
	 * @param {Object} defaultOptions  Any options to use for every request
	 * @returns {ApiService}
	 */
	addDefaultOptions(defaultOptions) {
		Object.assign(this._defaultOptions, defaultOptions);
		return this;
	}

	/**
	 * Make an HTTP request
	 * @param {String} method  GET, POST, DELETE, etc.
	 * @param {String} endpoint  The name of the API endpoint such as /posts/123
	 * @param {Object|null} [paramsOrData]  For GET requests, the query params; otherwise JSON payload
	 * @param {Object_null} [kyOverrides]  Additional overrides including headers
	 * @return {Promise<ApiResponse | ApiError>}
	 */
	request(method, endpoint, paramsOrData = null, kyOverrides = null) {
		let params, data;
		if (/^get|head$/i.test(method)) {
			params = paramsOrData;
		} else {
			data = paramsOrData;
		}
		const options = { ...this._defaultOptions, ...kyOverrides };
		const request = new ApiRequest(method, endpoint, params, data, options);
		// return cached promise if available
		let cached = this.cache.find(request);
		if (cached) {
			return cached.promise;
		}
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
			this.cache.add(request, promise);
		}
		this.pendingRequests.push({ request, promise });
		return promise;
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
				// aborted by the user
				return Promise.reject(this._handleAborted(request, error));
			} else if (error instanceof ky.HTTPError) {
				// a non 2xx status code
				return this._handleHttpError(request, error).then(
					apiError => Promise.reject(apiError),
					/* istanbul ignore next */
					shouldNeverHappen => shouldNeverHappen
				);
			} else if (error instanceof ky.TimeoutError) {
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
		// error.type = 'timeout';
		const response = new ApiError({ error, request });
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
		// error will be:
		// AbortError { type: 'aborted', message: 'The user aborted a request.' }
		const response = new ApiError({ error, request });
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
		const response = new ApiError({ error, request });
		this.interceptors.error.forEach(interceptor => {
			interceptor(request, response, this);
		});
		return response;
	}

	/**
	 * Given a fetch Response, get the json response or plain text
	 * @param response
	 * @returns {Promise}
	 * @property {String|null}  The type of response (json, text, or null)
	 * @property {*} data  The json data response
	 * @property {String|null} text  The plain text response if valid json is not present
	 * @private
	 */
	async _readResponseData(response) {
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
	 * @param {String|URL} endpoint  The endpoint such as "/posts/123"
	 * @param {Object} [params]  Parameters to send in the query string
	 * @param {Object} [kyOverrides]  Values to override ky request
	 * @returns {Promise}  Resolves with the ApiResponse and rejects with ApiError
	 */
	get(endpoint, params = {}, kyOverrides = {}) {
		return this.request('get', endpoint, params, kyOverrides);
	}

	/**
	 * Make a HEAD request to the specified endpoint
	 * @param {String|URL} endpoint  The endpoint such as "/posts/123"
	 * @param {Object} [params]  Parameters to send in the query string
	 * @param {Object} [kyOverrides]  Values to override ky request
	 * @returns {Promise}  Resolves with the ApiResponse and rejects with ApiError
	 */
	head(endpoint, params = {}, kyOverrides = {}) {
		return this.request('head', endpoint, params, kyOverrides);
	}

	/**
	 * Make a POST request to the specified endpoint
	 * @param {String|URL} endpoint  The endpoint such as "/posts"
	 * @param {Object} [payload]  Data to send in the post body
	 * @param {Object} [kyOverrides]  Values to override ky request
	 * @returns {Promise}  Resolves with the ApiResponse and rejects with ApiError
	 */
	post(endpoint, payload = {}, kyOverrides = {}) {
		return this.request('post', endpoint, payload, kyOverrides);
	}

	/**
	 * Make a PUT request to the specified endpoint
	 * @param {String|URL} endpoint  The endpoint such as "/posts/123/keywords"
	 * @param {Object} [payload]  Data to send in the post body
	 * @param {Object} [kyOverrides]  Values to override ky request
	 * @returns {Promise}  Resolves with the ApiResponse and rejects with ApiError
	 */
	put(endpoint, payload = {}, kyOverrides = {}) {
		return this.request('put', endpoint, payload, kyOverrides);
	}

	/**
	 * Make a PATCH request to the specified endpoint
	 * @param {String|URL} endpoint  The endpoint such as "/posts/123"
	 * @param {Object} [payload]  Parameters to send in the patch payload
	 * @param {Object} [kyOverrides]  Values to override ky request
	 * @returns {Promise}  Resolves with the ApiResponse and rejects with ApiError
	 */
	patch(endpoint, payload = {}, kyOverrides = {}) {
		return this.request('patch', endpoint, payload, kyOverrides);
	}

	/**
	 * Make a DELETE request to the specified endpoint
	 * @param {String|URL} endpoint  The endpoint such as "/posts/123"
	 * @param {Object} [payload]  Parameters to send in the delete payload
	 * @param {Object} [kyOverrides]  Values to override ky request
	 * @returns {Promise}  Resolves with the ApiResponse and rejects with ApiError
	 */
	delete(endpoint, payload = {}, kyOverrides = {}) {
		return this.request('delete', endpoint, payload, kyOverrides);
	}

	/**
	 * Examine two objects and execute a PATCH request on the differences
	 * @param {String|URL} endpoint  The endpoint such as "/posts/123"
	 * @param {Object} oldValues  Values before
	 * @param {Object} newValues
	 * @param {Object} [kyOverrides]  Values to override ky request
	 * @returns {Promise}  Resolves with null if no change is needed
	 *     or else the ApiResponse and rejects with ApiError
	 */
	async patchDifference(endpoint, oldValues, newValues, kyOverrides = {}) {
		const diff = {};
		let hasChanges = false;
		for (const prop in newValues) {
			/* istanbul ignore next */
			if (!newValues.hasOwnProperty(prop)) {
				continue;
			}
			if (!isEqual(newValues[prop], oldValues[prop])) {
				diff[prop] = newValues[prop];
				hasChanges = true;
			}
		}
		if (!hasChanges) {
			return {
				diff,
				hasChanges,
				response: null,
			};
		}
		const response = await this.request('PATCH', endpoint, diff, kyOverrides);
		return {
			diff,
			hasChanges,
			response,
		};
	}

	/**
	 * Submit a job for processing and provide a callback mechanism
	 * to be notified when the job is complete
	 * @param {String|URL} endpoint  The endpoint such as "/posts/123"
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
				if (response.status !== 202) {
					return;
				}
				const jobId = response.data.job_id;
				const start = +new Date();
				let timer;
				response.onJobComplete = (
					callback,
					recheckIntervalMs = 5000,
					timeout = 30 * 60 * 1000
				) => {
					timer = setInterval(() => {
						this.get(`/api_jobs/${jobId}`, { uuid: jobId }).then(response => {
							if (response.data.completed_at) {
								clearInterval(timer);
								callback(response);
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
			},
			error => error
		);
	}
}

module.exports = ApiService;
