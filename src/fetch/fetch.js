const isNode =
	typeof process !== 'undefined' && process.versions && process.versions.node;
/* istanbul ignore next */
if (isNode) {
	// TODO: check if tree shaking works properly. If not, try process.env.BROWSER
	// add polyfills for node/jest
	globalThis.fetch = require('node-fetch');
	globalThis.AbortController = require('abort-controller');
}

/**
 * Error that rejects when response has taken longer than the given timeout
 */
class TimeoutError extends Error {}

/**
 * Error that rejects when response is 4xx or 5xx
 */
class HTTPError extends Error {}

/**
 * A version of fetch that accepts a number for options.timeout
 * @param {String} url  The URL to fetch
 * @param {Object} options  fetch options including timeout
 * @returns {Promise}
 */
function fetchWithTimeout(url, options) {
	if (options.timeout > 0) {
		return new Promise((resolve, reject) => {
			const controller = new globalThis.AbortController();
			const timeout = setTimeout(() => {
				controller.abort();
				reject(new TimeoutError('Request timed out'));
			}, options.timeout);
			if (options.signal) {
				options.signal.addEventListener('abort', () => {
					controller.abort();
					clearTimeout(timeout);
				});
			}
			options.signal = controller.signal;
			globalThis.fetch(url, options).then(resolve, reject);
		});
	} else {
		return globalThis.fetch(url, options);
	}
}

module.exports = {
	fetch: fetchWithTimeout,
	AbortController: globalThis.AbortController,
	TimeoutError,
	HTTPError,
};
