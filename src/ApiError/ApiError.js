const ApiResponse = require('../ApiResponse/ApiResponse.js');

class ApiError extends ApiResponse {
	constructor({
		error,
		request,
		response = null,
		type = null,
		data = null,
		text = null,
	}) {
		super({ request, response, type, data, text });
		this.error = error;
	}
}

module.exports = ApiError;
