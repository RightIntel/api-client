const tryJson = require('./tryJson.js');

describe('tryJson.parse()', () => {
	it('should parse valid JSON', () => {
		const result = tryJson.parse('[2,"two"]');
		expect(result).toEqual([2, 'two']);
	});
	it('should fall back to default', () => {
		const result = tryJson.parse('foo bar', ['foo']);
		expect(result).toEqual(['foo']);
	});
	it('should fall back to undefined', () => {
		const result = tryJson.parse('a');
		expect(result).toBe(undefined);
	});
});

describe('tryJson.stringify()', () => {
	it('should stringify valid objects', () => {
		const result = tryJson.stringify([2, 'two']);
		expect(result).toBe('[2,"two"]');
	});
	it('should fall back to default when cyclical', () => {
		const a = { b: 2 };
		a.ay = a;
		const result = tryJson.stringify(a, ['foo']);
		expect(result).toEqual(['foo']);
	});
	it('should return undefined when unserializable', () => {
		const result = tryJson.stringify(() => 1);
		expect(result).toBe(undefined);
	});
});
