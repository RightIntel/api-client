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
	 * Return a simple representation of error, request and response
	 * @returns {Object}
	 */
	debug() {
		const debugged = super.debug();
		return {
			errorMessage: this.error.message,
			...debugged,
		};
	}
}

module.exports = ApiError;
