const getObjectSize = require('lodash/size');
const isEmptyObject = require('lodash/isEmpty');
const tryJson = require('../tryJson/tryJson.js');

/**
 * A class representing an API response from ApiService
 */
class ApiResponse {
	/**
	 * Initialize a response with the given data
	 * @param {Object} init
	 * @property {ApiRequest} request  The request that called ky
	 * @property {Response|null} response  The raw fetch response
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
		wasAborted = false,
	}) {
		/**
		 * @var {ApiRequest|Object} request  The ApiRequest that generated this response
		 */
		this.request = request || {};

		/**
		 * The fetch Response object
		 * @var {Response|Object}
		 * @see https://developer.mozilla.org/en-US/docs/Web/API/Response
		 */
		this.rawResponse = response || {};

		/**
		 * An object with a key for each lower-case header name
		 * @var {Object} headers
		 */
		this.headers = this._buildHeaders(this.rawResponse.headers || {});

		/**
		 * The body stream
		 * @var {ReadableStream<Uint8Array>}
		 */
		this.body = this.rawResponse.body;

		/**
		 * @var {String|null} dataType  Either json, text or null depending on type of data returned
		 */
		this.dataType = type;

		/**
		 * @var {*|null} data  JSON data returned by the endpoint (usually Array or Object)
		 */
		this.data = data;

		/**
		 * @var {String|null} text  Text data returned by the endpoint
		 */
		this.text = text;

		/**
		 * True if stream has been read before
		 * @var {Boolean}
		 */
		this.bodyUsed = this.rawResponse.bodyUsed;

		/**
		 * True if there was a redirect before this response
		 * @var {Boolean}
		 */
		this.redirected = this.rawResponse.redirected;

		/**
		 * The HTTP type
		 * @var {String}  One of "basic" | "cors" | "default" | "error" | "opaque" | "opaqueredirect"
		 */
		this.type = this.rawResponse.type;

		/**
		 * The final URL of this response
		 * @var {String}
		 */
		this.url = this.rawResponse.url;

		/**
		 * True if http status is 2xx
		 * @var {Boolean}
		 */
		this.ok = this.rawResponse.ok || false;

		/**
		 * The http status number
		 * @var {Number}
		 */
		this.status = this.rawResponse.status;

		/**
		 * The http status text (e.g. OK or Forbidden)
		 * @var {String}
		 */
		this.statusText = this.rawResponse.statusText;

		/**
		 * The category of response (one of 1xx, 2xx, 3xx, 4xx, 5xx)
		 * @var {String}
		 */
		this.statusClass = String(this.rawResponse.status).slice(0, 1) + 'xx';

		/**
		 * The total found rows (e.g. number of results if limit were not applied)
		 * @var {Number|null}
		 */
		this.total = parseFloat(this.headers['api-total-records']) || null;

		/**
		 * The number of records returned
		 * @var {Number}
		 */
		this.size = typeof this.data === 'object' ? getObjectSize(this.data) : null;

		/**
		 * The max number of records requested
		 * @var {Number}
		 */
		this.limit = this._getIntParam('limit');

		/**
		 * The page of records requested
		 * @var {Number}
		 */
		this.page = this._getIntParam('page');

		/**
		 * The total number of pages of records
		 * @var {Number|null}
		 */
		this.numPages = Math.ceil(this.total / this.limit) || null;

		/**
		 * The id of a newly-created record (e.g. through POST or PUT)
		 * @var {Number|null}
		 */
		this.newId = this._getNewId();

		/**
		 * True if no records were returned
		 * @var {Boolean}
		 */
		this.isEmpty =
			(Array.isArray(this.data) && this.data.length === 0) ||
			this.text === '' ||
			isEmptyObject(this.data);

		/**
		 * The value of the Location HTTP response header
		 * @var {String}
		 */
		this.location = this.headers['location'];

		/**
		 * The value of the Content-type HTTP response header
		 * @var {String}
		 */
		this.contentType = this.headers['content-type'];

		/**
		 * The value of the Content-Length HTTP response header
		 * @var {Number}
		 */
		this.contentLength = parseInt(this.headers['content-length'], 10);

		/**
		 * Notices reported by the API
		 * @var {Array}
		 */
		this.notices = tryJson.parse(this.headers['api-response-notices'], []);

		/**
		 * Errors reported by the API
		 * @var {Array}
		 */
		this.errors = tryJson.parse(this.headers['api-response-errors'], []);

		/**
		 * The APIs response id UUID
		 * @var {String}
		 */
		this.responseId = this.headers['api-response-id'];

		/**
		 * The total time the API reported it took
		 * @var {Number}
		 */
		this.time = parseFloat(this.headers['api-response-time']) || 0;

		/**
		 * True if response comes from aborted request
		 * @type {Boolean}
		 */
		this.wasAborted = !!wasAborted;
	}

	/**
	 * Get a object representation of this response and its request
	 * @returns {Object}
	 */
	debug() {
		return {
			status: this.status,
			statusText: this.statusText,
			headers: this.headers,
			data: this.data || this.text,
			request: {
				method: this.request.method,
				endpoint: this.request.endpoint,
				params: this.request.params,
				data: this.request.data,
				headers: this.request.headers,
				options: this.request.options,
			},
		};
	}

	/**
	 * Take response headers and convert to Object
	 * @param {Object|Headers} [headers]  The headers
	 * @private
	 */
	_buildHeaders(headers = {}) {
		const build = {};
		if (
			headers &&
			headers.constructor &&
			headers.constructor.name === 'Headers'
		) {
			for (const [name, value] of headers) {
				build[name.toLocaleLowerCase()] = value;
			}
		} else if (typeof headers === 'object') {
			for (const name in headers) {
				// istanbul ignore next
				if (!headers.hasOwnProperty(name)) {
					continue;
				}
				build[name.toLocaleLowerCase()] = headers[name];
			}
		}
		return build;
	}

	/**
	 * The id of the newly created record
	 * @returns {Number|String|null}
	 */
	_getNewId() {
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
