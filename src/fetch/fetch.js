const isNode =
	typeof process !== 'undefined' && process.versions && process.versions.node;
let fetch, AbortController;
/* istanbul ignore next */
if (isNode) {
	// node/jest using shimmed fetch()
	fetch = require('node-fetch');
	AbortController = require('abort-controller');
} else {
	// browser using native fetch()
	fetch = window.fetch;
	AbortController = window.AbortController;
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
			const controller = new AbortController();
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
			fetch(url, options).then(resolve, reject);
		});
	} else {
		return fetch(url, options);
	}
}

module.exports = {
	fetch: fetchWithTimeout,
	AbortController,
	TimeoutError,
};
