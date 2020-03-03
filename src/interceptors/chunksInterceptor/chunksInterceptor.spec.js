const chunksInterceptor = require('./chunksInterceptor.js');

describe('chunksInterceptor', () => {
	it('should have a request interceptor', () => {
		expect(chunksInterceptor.request).toBeInstanceOf(Function);
	});

	it('should not touch short values', () => {
		const request = {
			headers: {
				Short: 'ab',
			},
		};
		const expected = {
			Short: 'ab',
		};
		chunksInterceptor.request({ request });
		expect(request.headers).toEqual(expected);
	});

	it('should chunk long values', () => {
		const request = {
			headers: {
				Long: new Array(8002).join('a'),
			},
		};
		const expected = {
			'Long-Chunk-0': new Array(8001).join('a'),
			'Long-Chunk-1': 'a',
		};
		chunksInterceptor.request({ request });
		expect(request.headers).toEqual(expected);
	});
});
