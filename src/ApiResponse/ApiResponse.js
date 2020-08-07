const getObjectSize = require('lodash/size');
const isEmptyObject = require('lodash/isEmpty');

/**
 * A class representing an API response from ApiService
 */
class ApiResponse {
	/**
	 * @var {ApiRequest} request  The ApiRequest that generated this response
	 */

	/**
	 * @var {Response} _response  The fetch Response object
	 * @private
	 */

	/**
	 * @var {Object} headers  The lower-case headers returned
	 */

	/**
	 * @var {String|null} dataType  Either json, text or null depending on type of data returned
	 */

	/**
	 * @var {*|null} data  JSON data returned by the endpoint (usually Array or Object)
	 */

	/**
	 * @var {String|null} text  Text data returned by the endpoint
	 */

	/**
	 * Initialize a response with the given data
	 * @param {Object} init
	 * @property {ApiRequest} request  The request that called ky
	 * @property {Response} response  The raw fetch response
	 * @property {String|null} type  Either json, text or null depending on type of data returned
	 * @property {*|null} data  JSON data returned by the endpoint (usually Array or Object)
	 * @property {String|null} text  Text data returned by the endpoint
	 */
	constructor({
		request,
		response = null,
		type = null,
		data = null,
		text = null,
	}) {
		this.request = request;
		if (!response) {
			response = {};
		}
		this._processHeaders(response.headers || {});
		this._response = response;
		this.dataType = type;
		this.data = data;
		this.text = text;
	}

	/**
	 * Get a object representation of this request/response
	 * @returns {{request: {headers: ({}|Object), endpoint: string, method: string, payload: {}, options: *}, response: {headers: {}, data: (*|null), statusText: String, dataType: null, text: (String|null), status: Number}}}
	 */
	debug() {
		return {
			request: {
				method: this.request._method.toUpperCase(),
				endpoint: this.request.endpoint,
				payload: this.request._params,
				options: this.request.options,
				headers: this.request.headers,
			},
			response: {
				status: this.status,
				statusText: this.statusText,
				headers: this.headers,
				dataType: this.dataType,
				data: this.data,
				text: this.text,
			},
		};
	}

	/**
	 * Take response headers and convert to Object
	 * @param {Object|Headers} [headers]  The headers
	 * @private
	 */
	_processHeaders(headers = {}) {
		this.headers = {};
		if (
			headers &&
			headers.constructor &&
			headers.constructor.name === 'Headers'
		) {
			for (const [name, value] of headers) {
				this.headers[name.toLocaleLowerCase()] = value;
			}
		} else if (typeof headers === 'object') {
			for (const name in headers) {
				this.headers[name.toLocaleLowerCase()] = headers[name];
			}
		}
	}

	/**
	 * The fetch response
	 * @returns {Response}
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/Response
	 */
	get rawResponse() {
		return this._response;
	}

	/**
	 * The body stream
	 * @returns {ReadableStream<Uint8Array>}
	 */
	get body() {
		return this._response.body;
	}

	/**
	 * True if stream has been read before
	 * @returns {Boolean}
	 */
	get bodyUsed() {
		return this._response.bodyUsed;
	}

	/**
	 * True if there was a redirect before this response
	 * @returns {Boolean}
	 */
	get redirected() {
		return this._response.redirected;
	}

	/**
	 * The HTTP type
	 * @returns {String}  One of "basic" | "cors" | "default" | "error" | "opaque" | "opaqueredirect"
	 */
	get type() {
		return this._response.type;
	}

	/**
	 * The final URL of this response
	 * @returns {String}
	 */
	get url() {
		return this._response.url;
	}

	/**
	 * True if http status is 2xx
	 * @returns {Boolean}
	 */
	get ok() {
		return this._response.ok || false;
	}

	/**
	 * The http status number
	 * @returns {Number}
	 */
	get status() {
		return this._response.status;
	}

	/**
	 * The http status text (e.g. OK or Forbidden)
	 * @returns {String}
	 */
	get statusText() {
		return this._response.statusText;
	}

	/**
	 * The category of response (one of 1xx, 2xx, 3xx, 4xx, 5xx)
	 * @returns {String}
	 */
	get statusClass() {
		return String(this._response.status).slice(0, 1) + 'xx';
	}

	/**
	 * The total found rows (e.g. number of results if limit were not applied)
	 * @returns {Number|null}
	 */
	get total() {
		return parseFloat(this.headers['api-total-records']) || null;
	}

	/**
	 * The number of records returned
	 * @returns {Number}
	 */
	get size() {
		return getObjectSize(this.data);
	}

	/**
	 * The max number of records requested
	 * @returns {Number}
	 */
	get limit() {
		return this._getIntParam('limit');
	}
	/**
	 * The page of records requested
	 * @returns {Number}
	 */
	get page() {
		return this._getIntParam('page');
	}

	/**
	 * The total number of pages of records
	 * @returns {Number|null}
	 */
	get numPages() {
		return Math.ceil(this.total / this.limit) || null;
	}

	/**
	 * True if no records were returned
	 * @returns {Boolean}
	 */
	get isEmpty() {
		return (
			(Array.isArray(this.data) && this.data.length === 0) ||
			this.text === '' ||
			isEmptyObject(this.data)
		);
	}

	/**
	 * The value of the Location HTTP response header
	 * @returns {String}
	 */
	get location() {
		return this.headers['location'];
	}

	/**
	 * The value of the Content-type HTTP response header
	 * @returns {String}
	 */
	get contentType() {
		return this.headers['content-type'];
	}

	/**
	 * The value of the Content-Length HTTP response header
	 * @returns {Number}
	 */
	get contentLength() {
		return parseInt(this.headers['content-length'], 10);
	}

	/**
	 * Notices reported by the API
	 * @returns {Array}
	 */
	get notices() {
		return JSON.parse(this.headers['api-response-notices'] || '[]') || [];
	}

	/**
	 * Errors reported by the API
	 * @returns {Array}
	 */
	get errors() {
		return JSON.parse(this.headers['api-response-errors'] || '[]') || [];
	}

	/**
	 * The APIs response id UUID
	 * @returns {String}
	 */
	get responseId() {
		return this.headers['api-response-id'];
	}

	/**
	 * The id of the newly created record
	 * @returns {Number|String|null}
	 */
	get newId() {
		let id = this.headers['api-new-record-id'];
		if (!id) {
			id = this.headers['api-record-id'];
		}
		if (!id) {
			const location = this.headers['location'];
			const match = String(location).match(/\/(\d+)$/);
			id = match ? match[1] : null;
		}
		if (!id) {
			return null;
		}
		if (/^[1-9]+\d*$/.test(id)) {
			// only digits
			return parseInt(id, 10);
		}
		// may be a uuid
		return id;
	}

	/**
	 * The total time the API reported it took
	 * @returns {Number}
	 */
	get time() {
		return parseFloat(this.headers['api-response-time']) || 0;
	}

	/**
	 * Get the integer value of the given request params (used for limit and page)
	 * @param {String} name  The name of the param (limit or page)
	 * @returns {Number|null}
	 * @private
	 */
	_getIntParam(name) {
		if (
			this.request.searchParams &&
			this.request.searchParams[name] !== undefined
		) {
			return parseInt(this.request.searchParams[name], 10);
		}
		const urlRegex = new RegExp(`(?:\\?|&)${name}=(\\d+)(&|$)`);
		const match = this.request.url && this.request.url.match(urlRegex);
		if (!match) {
			return null;
		}
		return parseInt(match[1], 10) || null;
	}
}

module.exports = ApiResponse;
