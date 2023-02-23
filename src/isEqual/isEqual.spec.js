const isEqual = require('./isEqual.js');
describe('isEqual with values', () => {
	it('should respond to two undefineds', () => {
		expect(isEqual(undefined, undefined)).toBe(true);
	});
	it('should respond to two nulls', () => {
		expect(isEqual(null, null)).toBe(true);
	});
	it('should respond to one null', () => {
		expect(isEqual(null, 1)).toBe(false);
	});
	it('should respond to NaN', () => {
		expect(isEqual(NaN, NaN)).toBe(true);
	});
	it('should respond equal strings', () => {
		expect(isEqual('a', 'a')).toBe(true);
	});
	it('should respond unequal strings', () => {
		expect(isEqual('ab', 'a')).toBe(false);
	});
	it('should respond to equal booleans', () => {
		expect(isEqual(true, true)).toBe(true);
	});
	it('should respond to unequal booleans', () => {
		expect(isEqual(true, false)).toBe(false);
	});
	it('should respond to equal functions', () => {
		expect(isEqual(console.log, console.log)).toBe(true);
	});
	it('should respond to unequal functions', () => {
		expect(isEqual(console.log, console.error)).toBe(false);
	});
	it('should respond to equal numbers', () => {
		expect(isEqual(12, 12)).toBe(true);
	});
	it('should respond to unequal numbers', () => {
		expect(isEqual(12, 99)).toBe(false);
	});
	it('should respond to equal symbols', () => {
		expect(isEqual(Symbol.iterator, Symbol.iterator)).toBe(true);
	});
	it('should respond to unequal symbols', () => {
		expect(isEqual(Symbol(1), Symbol(1))).toBe(false);
	});
});
describe('isEqual with arrays', () => {
	it('should respond to one Array', () => {
		expect(isEqual([], {})).toBe(false);
	});
	it('should respond to one Array (right side)', () => {
		expect(isEqual({}, [])).toBe(false);
	});
	it('should respond to arrays of different length', () => {
		expect(isEqual([1, 2], [1])).toBe(false);
	});
	it('should respond to two empty arrays', () => {
		expect(isEqual([], [])).toBe(true);
	});
	it('should respond to two non-empty arrays', () => {
		expect(isEqual([1, 2], [1, 2])).toBe(true);
	});
	it('should respond to two non-empty unequal arrays', () => {
		expect(isEqual([1, 2], [7, 3])).toBe(false);
	});
	it('should compare shallowly', () => {
		expect(isEqual([1, {}], [1, {}])).toBe(false);
	});
});
describe('isEqual with objects', () => {
	it('should respond to one Object', () => {
		expect(isEqual({}, null)).toBe(false);
	});
	it('should respond to one Object (right side)', () => {
		expect(isEqual(null, {})).toBe(false);
	});
	it('should respond to one Object and one array', () => {
		expect(isEqual({}, [])).toBe(false);
	});
	it('should respond to empty objects', () => {
		expect(isEqual({}, {})).toBe(true);
	});
	it('should respond to objects with different lengths', () => {
		expect(isEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
	});
	it('should respond to objects with different values', () => {
		expect(isEqual({ a: 1, b: 78 }, { a: 1, b: 2 })).toBe(false);
	});
});
