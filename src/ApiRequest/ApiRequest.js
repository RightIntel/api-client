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
		method = 'GET',
		endpoint = '',
		params = undefined,
		data = undefined,
		options = undefined
	) {
		// save passed values
		if (!options) {
			options = {};
		}
		const {
			paramsSerializer = stringify,
			paramsUnserializer = parse,
			headers = {},
			baseURL = '',
			...kyOptions
		} = options;
		this.paramsSerializer = paramsSerializer;
		this.paramsUnserializer = paramsUnserializer;
		this.options = kyOptions;
		this.headers = headers;
		this.pending = false;
		this.completed = false;
		this.method = method;
		this.params = params;
		this.endpoint = baseURL + endpoint;
		this.data = data;
		this._abortController = new AbortController();
		this._markComplete = this._markComplete.bind(this);
	}

	/**
	 * Convert incoming headers to object
	 * @param {Object|Headers|null} headers  Request headers
	 * @private
	 */
	set headers(headers) {
		if (headers instanceof Headers) {
			this._headers = {};
			for (const [name, value] of headers) {
				this._headers[name] = value;
			}
		} else {
			this._headers = headers || {};
		}
	}

	/**
	 * Get the headers as a plain object
	 * @returns {Object}
	 */
	get headers() {
		return this._headers;
	}

	/**
	 * Get the HTTP verb in uppercase
	 * @returns {String}
	 */
	get method() {
		return this._method;
	}

	/**
	 * Set the HTTP verb
	 * @param {String} newMethod  The verb to use
	 */
	set method(newMethod) {
		this._method = newMethod.toUpperCase();
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
		if (typeof newParams === 'string' || newParams instanceof URLSearchParams) {
			this._params = this.paramsUnserializer(newParams);
		} else if (typeof newParams === 'object') {
			this._params = newParams;
		} else {
			this._params = {};
		}
		this._queryString = this.paramsSerializer(this._params);
		this._url = this._buildUrl(this._url);
	}

	/**
	 * Get the query string based on this object's params
	 * @returns {String}
	 */
	get queryString() {
		return this._queryString;
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
	_buildUrl(endpointOrUrl) {
		if (endpointOrUrl instanceof URL) {
			return this._finalizeUrl(endpointOrUrl.toString());
		}
		// URL is already a full URL
		// or URL has domain but implicit protocol
		if (/^(https?:\/\/|:\/\/|\/\/)/i.test(endpointOrUrl)) {
			return this._finalizeUrl(endpointOrUrl);
		}
		// URL is relative to domain
		let version = 'v2';
		const endpoint = String(endpointOrUrl || '').replace(
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
				queryString = '?' + qs;
			} else if (search === '') {
				queryString = '?';
			}
		}
		return path + queryString;
	}

	/**
	 * Set the endpoint or full URL to use
	 * @param {String} endpointOrUrl
	 */
	set url(endpointOrUrl) {
		this._url = this._buildUrl(endpointOrUrl);
	}

	/**
	 * Get the full URL
	 * @returns {String}
	 */
	get url() {
		return this._url;
	}

	/**
	 * Set the endpoint and the URL
	 * @param {String} urlOrEndpoint
	 */
	set endpoint(urlOrEndpoint) {
		this._endpoint = urlOrEndpoint || '';
		this._url = this._buildUrl(urlOrEndpoint);
	}

	/**
	 * Get the endpoint string
	 * @returns {String}
	 */
	get endpoint() {
		return this._endpoint;
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
