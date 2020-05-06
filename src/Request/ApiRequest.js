const isEmpty = require('lodash/isEmpty.js');
const ky = require('../ky/ky.js');

class ApiRequest {
	constructor(method, endpoint, params = {}, data = undefined, options = {}) {
		// save passed values
		this._method = method;
		this.endpoint = endpoint;
		this.params = params;
		this.data = data;
		const { headers, ...optionsNoHeaders } = options;
		this.options = optionsNoHeaders;
		this.headers = headers || {};
		this._abortController = new AbortController();
		this.pending = false;
		this.completed = false;
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
		this._headers = {};
		for (const [name, value] of new Headers(newHeaders)) {
			this._headers[name.toLocaleLowerCase()] = value;
		}
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
	set url(newUrl) {
		this.endpoint = newUrl;
	}
	abort() {
		if (this.pending) {
			this._abortController.abort();
		}
	}
	send() {
		const request = {
			method: this.method,
			headers: this.headers,
			signal: this._abortController.signal,
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
		this.completed = true;
	}
}

module.exports = ApiRequest;
