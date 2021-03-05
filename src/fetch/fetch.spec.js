const { TimeoutError, HTTPError } = require('./fetch.js');

describe('TimeoutError', () => {
	it('should be instance of Error', () => {
		expect(new TimeoutError('foo')).toBeInstanceOf(Error);
	});
});

describe('HTTPError', () => {
	it('should be instance of Error', () => {
		expect(new HTTPError('foo')).toBeInstanceOf(Error);
	});
});
