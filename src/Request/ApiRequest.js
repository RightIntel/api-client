let ky;
const isNode =
	typeof process !== 'undefined' && process.versions && process.versions.node;
/* istanbul ignore next */
if (isNode) {
	// node/jest using shimmed fetch()
	ky = require('ky-universal');
} else {
	// browser using native fetch()
	ky = require('ky');
	if (typeof ky !== 'function') {
		ky = ky.default;
	}
}

class ApiRequest {
	constructor(method, endpoint, params = {}, data = undefined, options = {}) {
		// initialize empty values
		this._params = {};
		this._headers = {};
		// save passed values
		this._method = method;
		this.endpoint = endpoint;
		this.params = params;
		this.data = data;
		const { headers, ...optionsNoHeaders } = options;
		this.options = optionsNoHeaders;
		this.headers = headers;
		this.abortController = new AbortController();
		this.pending = false;
		this._markComplete = this._markComplete.bind(this);
	}
	get method() {
		return this._method.toUpperCase();
	}
	set method(newMethod) {
		this._method = newMethod;
	}
	get params() {
		return this._params;
	}
	set params(newParams) {
		let usp = new URLSearchParams(newParams);
		const params = {};
		for (const [key, value] of usp.entries()) {
			params[key] = value;
		}
		this._params = params;
	}
	get headers() {
		return this._headers;
	}
	set headers(newHeaders) {
		const h = new Headers(newHeaders);
		const headers = {};
		for (const [key, value] of h.entries()) {
			headers[key] = value;
		}
		this._headers = headers;
	}
	get queryString() {
		// URLSearchParams accepts string, object or another URLSearchParams object
		const params = new URLSearchParams(this._params);
		params.sort();
		return params.toString().replace(/\+/g, '%20');
	}
	set queryString(newQueryString) {
		this._params = newQueryString;
	}
	get url() {
		if (this.endpoint instanceof URL) {
			return this._maybeAddQueryString(this.endpoint.toString());
		}
		// URL is already a full URL
		if (/^https?:\/\//i.test(this.endpoint)) {
			return this._maybeAddQueryString(this.endpoint);
		}
		const match = (this.endpoint || '').match(/^:?\/\/(.+)/);
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
	_maybeAddQueryString(value) {
		let suffix = '';
		if (this._params && !value.includes('?')) {
			const qs = this.queryString;
			suffix = qs ? `?${qs}` : '';
		}
		return value + suffix;
	}
	set url(newUrl) {
		this.endpoint = newUrl;
	}
	abort() {
		if (this.pending) {
			this.abortController.abort();
		}
	}
	send() {
		const request = {
			method: this.method,
			headers: this.headers,
			signal: this.abortController.signal,
			retry: { limit: 0 },
			throwHttpErrors: true,
			timeout: 5 * 60 * 1000,
			json: this.data,
			...this.options,
		};
		this.pending = true;
		this.promise = ky(this.url, request);
		this.promise.then(this._markComplete, this._markComplete);
		return this.promise;
	}
	_markComplete() {
		this.pending = false;
	}
}

module.exports = ApiRequest;
