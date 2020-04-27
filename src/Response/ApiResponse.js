const getObjectSize = require('lodash/size');
const isEmptyObject = require('lodash/isEmpty');

/**
 * A class representing an API response from ApiService
 */
class ApiResponse {
	/**
	 * @var {Object} request  The request parameters that were passed to ky
	 */

	/**
	 * @var {String|null} type  Either json, text or null depending on type of data returned
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
		if (!response.headers) {
			response.headers = new Headers();
		}
		this._response = response;
		this.type = type;
		this.data = data;
		this.text = text;
	}

	/**
	 * @var {Response} rawResponse  The fetch response
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/Response
	 */
	get rawResponse() {
		return this._response;
	}

	/**
	 * @var {Boolean} ok  True if http status is 2xx
	 */
	get ok() {
		return this._response.ok || false;
	}

	/**
	 * @var {Number} status  The http status number
	 */
	get status() {
		return this._response.status;
	}

	/**
	 * @var {String} statusText  The http status text (e.g. OK or Forbidden)
	 */
	get statusText() {
		return this._response.statusText;
	}

	/**
	 * @var {String} statusClass  The category of response (one of 1xx, 2xx, 3xx, 4xx, 5xx)
	 */
	get statusClass() {
		return String(this._response.status).slice(0, 1) + 'xx';
	}

	/**
	 * @var {Headers} headers  The fetch response headers
	 * @see https://developer.mozilla.org/en-US/docs/Web/API/Headers
	 */
	get headers() {
		return this._response.headers;
	}

	/**
	 * @var {Number|null} total  The total found rows (e.g. number of results if limit were not applied)
	 */
	get total() {
		return parseFloat(this._response.headers.get('API-Total-Records')) || null;
	}

	/**
	 * @var {Number} size  The number of records returned
	 */
	get size() {
		return getObjectSize(this.data);
	}

	/**
	 * @var {Number} limit  The max number of records requested
	 */
	get limit() {
		return this._getIntParam('limit');
	}
	/**
	 * @var {Number} page  The page of records requested
	 */
	get page() {
		return this._getIntParam('page');
	}

	/**
	 * @var {Number} numPages  The total number of pages of records
	 * @returns {number | null}
	 */
	get numPages() {
		return Math.ceil(this.total / this.limit) || null;
	}

	/**
	 * @var {Boolean} isEmpty  True if no records were returned
	 */
	get isEmpty() {
		return (
			(Array.isArray(this.data) && this.data.length === 0) ||
			this.text === '' ||
			isEmptyObject(this.data)
		);
	}

	/**
	 * @var {Number} location  The value of the Location HTTP response header
	 */
	get location() {
		return this._response.headers.get('Location');
	}

	/**
	 * @var {Number} location  The value of the Content-Type HTTP response header
	 */
	get contentType() {
		return this._response.headers.get('Content-Type');
	}

	/**
	 * @var {Number} location  The value of the Content-Length HTTP response header
	 */
	get contentLength() {
		return parseInt(this._response.headers.get('Content-Length'), 10);
	}

	/**
	 * @var {Array} notices  Notices from the API
	 */
	get notices() {
		return (
			JSON.parse(this._response.headers.get('API-Response-Notices') || '[]') ||
			[]
		);
	}

	/**
	 * @var {Array} errors  Errors from the API
	 */
	get errors() {
		return (
			JSON.parse(this._response.headers.get('API-Response-Errors') || '[]') ||
			[]
		);
	}

	/**
	 * @var {String} responseId  The APIs response id UUID
	 */
	get responseId() {
		return this._response.headers.get('API-Response-Id');
	}

	/**
	 * @var {Number|String|null} newId  The id of the newly created record
	 */
	get newId() {
		let id = this._response.headers.get('API-New-Record-Id');
		if (!id) {
			id = this._response.headers.get('API-Record-Id');
		}
		if (!id) {
			const location = this._response.headers.get('Location');
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
	 * @var {Number} time  The total time the API reported it took
	 */
	get time() {
		return parseFloat(this._response.headers.get('API-Response-Time')) || 0;
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
