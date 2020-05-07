const isEmpty = require('lodash/isEmpty.js');
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
		this._method = method;
		this.endpoint = endpoint;
		this.params = params;
		this.data = data;
		if (!options) {
			options = {};
		}
		const { headers, ...optionsNoHeaders } = options;
		this.options = optionsNoHeaders;
		this._processHeaders(headers);
		this._abortController = new AbortController();
		this.pending = false;
		this.completed = false;
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
		if (!newParams) {
			this._params = {};
			return;
		}
		let usp = new URLSearchParams(newParams);
		const params = {};
		for (const [key, value] of usp.entries()) {
			params[key] = value;
		}
		this._params = params;
	}

	/**
	 * Get the query string based on this object's params
	 * @returns {String}
	 */
	get queryString() {
		// URLSearchParams accepts string, object or another URLSearchParams object
		const params = new URLSearchParams(this._params);
		params.sort();
		return params.toString().replace(/\+/g, '%20');
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
			return this._maybeAddQueryString(this.endpoint.toString());
		}
		if (typeof this.endpoint !== 'string') {
			return '';
		}
		// URL is already a full URL
		if (/^https?:\/\//i.test(this.endpoint)) {
			return this._maybeAddQueryString(this.endpoint);
		}
		const match = this.endpoint.match(/^:?\/\/(.+)/);
		if (match) {
			/* istanbul ignore next */
			const protocol =
				typeof window !== 'undefined' && window.location
					? window.location.protocol
					: 'http:';
			return this._maybeAddQueryString(`${protocol}//${match[1]}`);
		}
		// construct using api base url
		let version = 'v2';
		const endpoint = this.endpoint.replace(
			/^(?:\/?api)?\/(v\d+)\//,
			($0, $1) => {
				version = $1;
				return '/';
			}
		);
		return this._maybeAddQueryString(`/api/${version}${endpoint}`);
	}

	/**
	 * Given a query string, add this._params if not empty
	 * @param {String} url  The full URL
	 * @returns {String}
	 * @private
	 */
	_maybeAddQueryString(url) {
		if (isEmpty(this._params)) {
			return url;
		}
		const match = url.match(/(.+)\?([^#]+)(#.*|)$/);
		if (match) {
			const urlParams = new URLSearchParams(match[2]);
			const objParams = new URLSearchParams(this._params);
			for (const [key, value] of objParams) {
				urlParams.append(key, value);
			}
			urlParams.sort();
			const qs = urlParams.toString().replace(/\+/g, '%20');
			return `${match[1]}?${qs}${match[3]}`;
		}
		return `${url}?${this.queryString}`;
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
