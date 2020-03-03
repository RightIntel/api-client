const ApiResponse = require('../Response/ApiResponse.js');

class ApiError extends ApiResponse {
    constructor({ error, ...responseProps }) {
        super(responseProps);
        this.error = error;
    }
}

module.exports = ApiError;
