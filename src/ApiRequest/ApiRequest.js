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
		params = {},
		data = {},
		options = {}
	) {
		// extract options
		const {
			paramsSerializer = stringify,
			paramsUnserializer = parse,
			headers = {},
			baseURL = '',
			...kyOptions
		} = options;
		// save passed values
		this.paramsSerializer = paramsSerializer;
		this.paramsUnserializer = paramsUnserializer;
		this.options = kyOptions;
		this.baseURL = baseURL;
		this.setHeaders(headers);
		this.pending = false;
		this.completed = false;
		this.setMethod(method);
		this.setParams(params);
		this.setEndpoint(endpoint);
		this.data = data;
		this._abortController = new AbortController();
		this._markComplete = this._markComplete.bind(this);
	}

	/**
	 * Convert incoming headers to object
	 * @param {Object|Headers|null} headers  Request headers
	 */
	setHeaders(headers) {
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
	 * Set the HTTP verb
	 * @param {String} newMethod  The verb to use
	 */
	setMethod(newMethod) {
		this.method = newMethod.toUpperCase();
	}

	/**
	 * Set the URL search params
	 * @param {Object|URLSearchParams|String|null} newParams
	 */
	setParams(newParams) {
		if (typeof newParams === 'string' || newParams instanceof URLSearchParams) {
			this.params = this.paramsUnserializer(newParams);
		} else if (typeof newParams === 'object') {
			this.params = newParams;
		} else {
			this.params = {};
		}
	}

	/**
	 * Set a new query string (same effect as setting params)
	 * @param {Object|URLSearchParams|String|null} newQueryString
	 */
	setQueryString(newQueryString) {
		this.setParams(newQueryString);
	}

	/**
	 * Get the full URL including baseURL, endpoint, and query params
	 * @returns {String}
	 */
	get url() {
		return this._buildUrl(this.endpoint);
	}

	/**
	 * Get the parameters as a serialized string
	 * @returns {String}
	 */
	get queryString() {
		return this.paramsSerializer(this.params);
	}

	/**
	 * Get the full URL including search params
	 * @returns {String}
	 */
	_buildUrl(endpointOrUrl) {
		if (endpointOrUrl instanceof URL) {
			endpointOrUrl = endpointOrUrl.toString();
		}
		let search = this.queryString;
		if (search.length > 0) {
			search = '?' + search;
		}
		// URL is already a full URL
		// or URL has domain but implicit protocol
		if (/^(https?:\/\/|:\/\/|\/\/)/i.test(endpointOrUrl)) {
			return `${endpointOrUrl}${search}`;
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
		return `${this.baseURL}/api/${version}${endpoint}${search}`;
	}

	/**
	 * Set the endpoint or full URL to use
	 * @param {String} urlOrEndpoint
	 */
	setUrl(urlOrEndpoint) {
		this.endpoint = urlOrEndpoint || '';
	}

	/**
	 * Set the endpoint and the URL
	 * @param {String} urlOrEndpoint
	 */
	setEndpoint(urlOrEndpoint) {
		// ensure a string
		this.endpoint = String(urlOrEndpoint || '');
		// strip of hash marks if needed
		const hashIndex = this.endpoint.indexOf('#');
		if (hashIndex > -1) {
			this.endpoint = this.endpoint.slice(0, hashIndex);
		}
		// unserialize params if needed
		const questionMarkIndex = this.endpoint.indexOf('?');
		if (questionMarkIndex > -1) {
			const start = this.endpoint.slice(0, questionMarkIndex);
			const qs = this.endpoint.slice(questionMarkIndex + 1);
			this.endpoint = start;
			if (questionMarkIndex > 0) {
				const queryParams = this.paramsUnserializer(qs);
				if (typeof this.params === 'object') {
					this.params = { ...queryParams, ...this.params };
				} else {
					this.params = queryParams;
				}
			}
		}
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
