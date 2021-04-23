const equalsOrMatches = require('./equalsOrMatches.js');

describe('equalsOrMatches()', () => {
	it('should verify *any value* matches undefined', () => {
		const result = equalsOrMatches('a');
		expect(result).toBe(true);
	});
	it('should verify string matches RegExp', () => {
		const result = equalsOrMatches('apple', /pp/);
		expect(result).toBe(true);
	});
	it('should verify string matches string', () => {
		const result = equalsOrMatches('apple', 'apple');
		expect(result).toBe(true);
	});
	it('should reject 2 different strings', () => {
		const result = equalsOrMatches('apple', 'banana');
		expect(result).toBe(false);
	});
	it('should reject 2 string that does not match regexp', () => {
		const result = equalsOrMatches('apple', /foo/);
		expect(result).toBe(false);
	});
});
