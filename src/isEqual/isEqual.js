const directlyComparable = [
	'bigint',
	'boolean',
	'function',
	'number',
	'string',
	'symbol',
	'undefined',
];

function isEqual(prev, next) {
	// handle null specially since typeof null === 'object'
	if (prev === null && next === null) {
		// both null
		return true;
	} else if (prev === null || next === null) {
		// one is null but not both
		return false;
	} else if (
		typeof prev === 'number' &&
		isNaN(prev) &&
		typeof next === 'number' &&
		isNaN(next)
	) {
		// both NaN
		return true;
	}
	if (directlyComparable.includes(typeof prev)) {
		return prev === next;
	}
	if (Array.isArray(prev)) {
		if (!Array.isArray(next)) {
			// one array and one non-array
			return false;
		}
		if (prev.length !== next.length) {
			// array cannot be the same because it has different lengths
			return false;
		}
		// shallow array comparison
		for (let i = 0, len = prev.length; i < len; i++) {
			if (prev[i] !== next[i]) {
				return false;
			}
		}
		return true;
	} else if (typeof prev === 'object') {
		if (!next || typeof next !== 'object' || Array.isArray(next)) {
			// one object and one non-object
			return false;
		}
		const prevKeys = Object.keys(prev);
		const nextKeys = Object.keys(next);
		if (prevKeys.length !== nextKeys.length) {
			return false;
		}
		// shallow object comparison
		for (const key of prevKeys) {
			if (next[key] !== prev[key]) {
				return false;
			}
		}
		return true;
	}
	// some future non-object data type not yet in the JavaScript specification
	/* istanbul ignore next @preserve */
	return prev === next;
}

module.exports = isEqual;
