const ApiResponse = require('../Response/ApiResponse.js');
const ApiError = require('./ApiError.js');

describe('ApiError instance', () => {
	let apiError;
	beforeEach(() => {
		apiError = new ApiError({
			error: 'moo',
			response: {
				status: 200,
			},
		});
	});
	it('should be an instance of ApiResponse', () => {
		expect(apiError).toBeInstanceOf(ApiResponse);
	});
	it('should have an error', () => {
		expect(apiError.error).toBe('moo');
	});
	it('should have ApiResponse methods', () => {
		expect(apiError.status).toBe(200);
	});
});
