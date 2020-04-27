const ApiResponse = require('../Response/ApiResponse.js');

class ApiError extends ApiResponse {
	constructor(request, response) {
		super(request);
		this.error = response;
	}
}

module.exports = ApiError;
