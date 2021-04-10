const ApiResponse = require('../ApiResponse/ApiResponse.js');

class ApiError extends ApiResponse {
	constructor({
		error,
		request,
		response = null,
		type = null,
		data = null,
		text = null,
		wasAborted = false,
	}) {
		super({ request, response, type, data, text, wasAborted });
		/**
		 * @var {Error}  The error object
		 */
		this.error = error;
	}

	/**
	 * @var {String} The type and message of the error object's error message
	 */
	get message() {
		const type = this.error.constructor.name;
		if (type === 'HTTPError') {
			const status =
				this.statusText || this.error.message || this.statusTextClass;
			return `HTTP ${this.status} ${status}`;
		}
		return `${type}: ${this.error.message}`;
	}

	/**
	 * @var {String} The stack trace of the error object
	 */
	get stack() {
		return this.error.stack;
	}

	/**
	 * Return a simple representation of error, request and response
	 * @returns {Object}
	 */
	debug() {
		const debugged = super.debug();
		return {
			errorMessage: this.message,
			...debugged,
		};
	}
}

module.exports = ApiError;
