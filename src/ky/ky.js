let ky;
const isNode =
	typeof process !== 'undefined' && process.versions && process.versions.node;
/* istanbul ignore next */
if (isNode) {
	// node/jest using shimmed fetch()
	ky = require('ky-universal');
} else {
	// browser using native fetch()
	ky = require('ky');
	if (typeof ky !== 'function') {
		ky = ky.default;
	}
}

module.exports = ky;
