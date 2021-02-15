const isNode =
	typeof process !== 'undefined' && process.versions && process.versions.node;
/* istanbul ignore next */
if (isNode) {
	// node/jest using shimmed fetch()
	globalThis.fetch = require('node-fetch');
	globalThis.AbortController = require('abort-controller');
}

function TimeoutError(message) {
	this.constructor.prototype.__proto__ = Error.prototype;
	Error.captureStackTrace(this, this.constructor);
	this.name = this.constructor.name;
	this.message = message;
}

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
};
