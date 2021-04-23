const { stringify, parse } = require('../SearchParams/SearchParams.js');
const { fetch, AbortController } = require('../fetch/fetch.js');
const tryJson = require('../tryJson/tryJson.js');

/**
 * A class to wrap the fetch request
 */
class ApiRequest {
	/**
	 * Initialize request but don't yet run it
	 * @param {String} [method]  The HTTP verb
	 * @param {String} [endpoint]  The API endpoint or full URL
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
		// auto-bind callbacks
		this._markComplete = this._markComplete.bind(this);
		// extract options
		const {
			paramsSerializer = stringify,
			paramsUnserializer = parse,
			headers = {},
			baseURL = '',
			...fetchOptions
		} = options;
		/**
		 * @var {Function}  The function that will serialize param objects to string
		 */
		this.paramsSerializer = paramsSerializer;
		/**
		 * @var {Function}  The function that will parse param strings into objects
		 */
		this.paramsUnserializer = paramsUnserializer;
		/**
		 * @var {Object}  The options that were passed to fetch()
		 */
		this.options = fetchOptions;
		/**
		 * @var {String}
		 */
		this.baseURL = baseURL;
		/**
		 * @var {Object}
		 */
		this.setHeaders(headers);
		/**
		 * @var {Boolean}  True if request is in progress
		 */
		this.pending = false;
		/**
		 * @var {Boolean}  True if request has completed
		 */
		this.completed = false;
		/**
		 * @var {String} method  The HTTP verb in upper case
		 */
		this.setMethod(method);
		/**
		 * @var {Object}  A plain object containing the query string params
		 */
		this.setParams(params);
		/**
		 * @var {String}  The endpoint or URL
		 */
		this.setEndpoint(endpoint);
		/**
		 * @var {Object}  The request payload (POST, PUT, PATCH, DELETE, etc)
		 */
		this.data = data;
		/**
		 * @var {AbortController}  The object that lets us call abort()
		 */
		this._abortController = new AbortController();
		/**
		 * @var {ApiResponse}  Set by ApiService when response is complete
		 */
		this.response = null;
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
		} else if (newParams && typeof newParams === 'object') {
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
		this.endpoint = String(urlOrEndpoint || '');
	}

	/**
	 * Set the endpoint and the URL
	 * @param {String} urlOrEndpoint
	 */
	setEndpoint(urlOrEndpoint) {
		// ensure a string
		this.endpoint = String(urlOrEndpoint || '');
		// strip off hash mark if needed
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
				if (this.params && typeof this.params === 'object') {
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
		const options = {
			method: this.method,
			headers: this.headers,
			signal: this._abortController.signal,
			timeout: 5 * 60 * 1000,
			...this.options,
		};
		if (!['GET', 'HEAD'].includes(this.method) && options.body === undefined) {
			options.body = tryJson.stringify(this.data);
		}
		this.pending = true;
		this.promise = fetch(this.url, options);
		this.promise.then(this._markComplete, this._markComplete);
		return this.promise;
	}

	/**
	 * Return a simple representation of request and response
	 * @returns {Object}
	 */
	debug() {
		const debugged = {
			method: this.method,
			endpoint: this.endpoint,
			params: this.params,
			data: this.data,
			options: this.options,
			headers: this.headers,
			response: null,
		};
		if (this.promise && this.response) {
			debugged.response = {
				status: this.response.status,
				statusText: this.response.statusText,
				headers: this.response.headers,
				data: this.response.data || this.response.text,
			};
		}
		return debugged;
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
