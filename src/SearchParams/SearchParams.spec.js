const { stringify, parse } = require('./SearchParams.js');

describe('SearchParams stringify()', () => {
	it('should handle an empty object', () => {
		const result = stringify({});
		expect(result).toBe('');
	});
	it('should use %20 for spaces', () => {
		const result = stringify({ greeting: 'hello world' });
		expect(result).toBe('greeting=hello%20world');
	});
	it('should use commas instead of %2C', () => {
		const result = stringify({ greeting: 'hello,world' });
		expect(result).toBe('greeting=hello,world');
	});
	it('should use commas for arrays', () => {
		const result = stringify({ greeting: ['hello', 'world'] });
		expect(result).toBe('greeting=hello,world');
	});
	it('should ignore undefined properties', () => {
		const result = stringify({ a: 1, b: undefined });
		expect(result).toBe('a=1');
	});
	it('should ignore null properties', () => {
		const result = stringify({ a: 1, b: null });
		expect(result).toBe('a=1');
	});
	it('should ignore function properties', () => {
		const result = stringify({ a: 1, b: () => 'foo' });
		expect(result).toBe('a=1');
	});
	it('should sort params', () => {
		const result = stringify({ b: 2, a: 1 });
		expect(result).toBe('a=1&b=2');
	});
	it('should convert true into 1', () => {
		const result = stringify({ flag: true });
		expect(result).toBe('flag=1');
	});
	it('should convert false into 0', () => {
		const result = stringify({ flag: false });
		expect(result).toBe('flag=0');
	});
	it('should format dates', () => {
		const result = stringify({ then: new Date('2021-01-01T12:00:00+00:00') });
		expect(result).toMatch(/^then=2021-01-01T/);
	});
	it('should barf objects', () => {
		const result = stringify({ a: { b: 2 } });
		expect(result).toBe('a=%5Bobject%20Object%5D');
	});
	it('should cast RegExp to string', () => {
		const result = stringify({ a: /^Foo/i });
		expect(result).toBe('a=%2F%5EFoo%2Fi');
	});
	it('should encode Unicode as UTF-8 hex', () => {
		const result = stringify({ smile: '😀' });
		expect(result).toBe('smile=%F0%9F%98%80');
	});
});

describe('SearchParams parse()', () => {
	it('should handle an empty string', () => {
		const result = parse('');
		expect(result).toEqual({});
	});
	it('should handle spaces', () => {
		const result = parse('space=%20');
		expect(result).toEqual({ space: ' ' });
	});
	it('should handle plus signs', () => {
		const result = parse('space=+');
		expect(result).toEqual({ space: ' ' });
	});
	it('should handle plain objects', () => {
		const result = parse({ a: '1' });
		expect(result).toEqual({ a: '1' });
	});
	it('should handle URLSearchParams from object', () => {
		const result = parse(new URLSearchParams({ a: '1' }));
		expect(result).toEqual({ a: '1' });
	});
	it('should handle URLSearchParams from string', () => {
		const result = parse(new URLSearchParams('a=1'));
		expect(result).toEqual({ a: '1' });
	});
});
