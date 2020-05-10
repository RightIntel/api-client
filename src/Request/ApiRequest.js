const { stringify, parse } = require('../SearchParams/SearchParams.js');
const ky = require('../ky/ky.js');

/**
 * A class to wrap the ky request
 */
class ApiRequest {
	/**
	 * Initialize request but don't yet run it
	 * @param {String} method  The HTTP verb
	 * @param {String} endpoint  The API endpoint or full URL
	 * @param {Object|String|URLSearchParams} [params]  The URL params
	 * @param {Object} [data]  Payload to send in request body
	 * @param {Object} [options]  headers and cacheFor plus options for ky
	 */
	constructor(
		method,
		endpoint,
		params = undefined,
		data = undefined,
		options = undefined
	) {
		// save passed values
		if (!options) {
			options = {};
		}
		const {
			paramsSerializer,
			paramsUnserializer,
			headers,
			...kyOptions
		} = options;
		this.paramsSerializer = paramsSerializer || stringify;
		this.paramsUnserializer = paramsUnserializer || parse;
		this.options = kyOptions;
		this._processHeaders(headers);
		this._abortController = new AbortController();
		this.pending = false;
		this.completed = false;
		this._method = method;
		this.endpoint = endpoint;
		this.params = params;
		this.data = data;
		this._markComplete = this._markComplete.bind(this);
	}

	/**
	 * Convert incoming headers to object
	 * @param {Object|Headers|null} headers  Request headers
	 * @private
	 */
	_processHeaders(headers) {
		this.headers = {};
		if (headers instanceof Headers) {
			this.headers = {};
			for (const [name, value] of headers) {
				this.headers[name] = value;
			}
		} else {
			this.headers = headers || {};
		}
	}

	/**
	 * Get the HTTP verb in uppercase
	 * @returns {String}
	 */
	get method() {
		return this._method.toUpperCase();
	}

	/**
	 * Set the HTTP verb
	 * @param {String} newMethod  The verb to use
	 */
	set method(newMethod) {
		this._method = newMethod;
	}

	/**
	 * Get the URL search params
	 * @returns {Object}
	 */
	get params() {
		return this._params;
	}

	/**
	 * Set the URL search params
	 * @param {Object|URLSearchParams|String|null} newParams
	 */
	set params(newParams) {
		if (newParams) {
			this._params = this.paramsUnserializer(newParams);
		} else {
			this._params = {};
		}
	}

	/**
	 * Get the query string based on this object's params
	 * @returns {String}
	 */
	get queryString() {
		return this.paramsSerializer(this._params);
	}

	/**
	 * Set a new query string (same effect as setting params)
	 * @param {Object|URLSearchParams|String|null} newQueryString
	 */
	set queryString(newQueryString) {
		this.params = newQueryString;
	}

	/**
	 * Get the full URL including search params
	 * @returns {String}
	 */
	get url() {
		if (this.endpoint instanceof URL) {
			return this._finalizeUrl(this.endpoint.toString());
		}
		if (typeof this.endpoint !== 'string') {
			return '';
		}
		// URL is already a full URL
		// or URL has domain but implicit protocol
		if (/^(https?:\/\/|:\/\/|\/\/)/i.test(this.endpoint)) {
			return this._finalizeUrl(this.endpoint);
		}
		// URL is relative to domain
		let version = 'v2';
		const endpoint = this.endpoint.replace(
			/^(?:\/?api)?\/(v\d+)\//,
			($0, $1) => {
				version = $1;
				return '/';
			}
		);
		return this._finalizeUrl(`/api/${version}${endpoint}`);
	}

	/**
	 * Given an endpoint or URL, add this._params if not empty
	 * @param {String} url  The endpoint or URL
	 * @returns {String}
	 * @private
	 */
	_finalizeUrl(url) {
		// remove any hash value
		url = url.replace(/#.*$/, '');
		const [path, search] = url.split('?');
		let queryString = '';
		// combine string params with object params
		if (search) {
			const urlParams = this.paramsUnserializer(search);
			const allParams = { ...urlParams, ...this._params };
			queryString = '?' + this.paramsSerializer(allParams);
		} else {
			const qs = this.queryString;
			if (qs) {
				queryString = '?' + this.queryString;
			} else if (search === '') {
				queryString = '?';
			}
		}
		return path + queryString;
	}

	/**
	 * Set the endpoint or full URL to use
	 * @param {String} newUrl
	 */
	set url(newUrl) {
		this.endpoint = newUrl;
	}

	/**
	 * Cancel this request if pending
	 */
	abort() {
		if (this.pending) {
			this._abortController.abort();
		}
	}

	/**
	 * Execute the request and return fetch's Response object
	 * @returns {Promise<Response>}
	 */
	send() {
		const request = {
			method: this.method,
			headers: this.headers,
			signal: this._abortController.signal,
			retry: { limit: 0 },
			throwHttpErrors: true,
			timeout: 5 * 60 * 1000,
			...this.options,
		};
		if (!['GET', 'HEAD'].includes(this.method)) {
			request.json = this.data;
		}
		this.pending = true;
		this.promise = ky(this.url, request);
		this.promise.then(this._markComplete, this._markComplete);
		return this.promise;
	}

	/**
	 * Mark this request as complete
	 * @private
	 */
	_markComplete() {
		this.pending = false;
		this.completed = true;
	}
}

module.exports = ApiRequest;
