const ApiResponse = require('../Response/ApiResponse.js');
const ApiError = require('./ApiError.js');

describe('ApiError instance', () => {
	let apiError;
	beforeEach(() => {
		apiError = new ApiError({ error: new Error('moo'), request: {} });
	});
	it('should be an instance of ApiResponse', () => {
		expect(apiError).toBeInstanceOf(ApiResponse);
	});
	it('should have an error', () => {
		expect(apiError.error.message).toBe('moo');
	});
});
