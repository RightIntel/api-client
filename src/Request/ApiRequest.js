let ky;
/* istanbul ignore next */
if (
	typeof process !== 'undefined' &&
	process.versions &&
	process.versions.node
) {
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
	constructor(
		method,
		endpoint,
		params = undefined,
		data = undefined,
		options = {}
	) {
		this._method = method;
		this.endpoint = endpoint;
		this._params = params;
		this.data = data;
		const { headers, ...optionsNoHeaders } = options;
		this.options = optionsNoHeaders;
		this.headers = new Headers(headers || {});
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
		let usp;
		if (this._params instanceof URLSearchParams) {
			usp = this._params;
		} else {
			usp = new URLSearchParams(this._params);
		}
		const params = {};
		for (const [key, value] of usp.entries()) {
			params[key] = value;
		}
		return params;
	}
	set params(newParams) {
		this._params = newParams;
	}
	get queryString() {
		if (!this._params) {
			return '';
		}
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
			return this.endpoint.toString();
		}
		// URL is already a full URL
		if (/^https?:\/\//i.test(this.endpoint)) {
			return this.endpoint;
		}
		const match = (this.endpoint || '').match(/^:?\/\/(.+)/);
		if (match) {
			return `http://${match[1]}`;
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
		const qs = this.queryString;
		const qmqs = qs ? `?${qs}` : '';
		return `/api/${version}${endpoint}${qmqs}`;
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
