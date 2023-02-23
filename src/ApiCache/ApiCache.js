const parseDuration = require('../parseDuration/parseDuration.js');
const equalsOrMatches = require('../equalsOrMatches/equalsOrMatches.js');

class ApiCache {
	/**
	 * Initialize cache array
	 */
	constructor() {
		this.entries = [];
	}

	/**
	 * Find cache entry by an ApiRequest's method, url and search params
	 * @param {ApiRequest} request
	 * @returns {Promise<ApiResponse>|null}  The promise object if found or null if not
	 */
	find(request) {
		const { method, url } = request;
		for (const entry of this.entries) {
			if (entry.request.method === method && entry.request.url === url) {
				return entry.getPromise();
			}
		}
		return null;
	}

	/**
	 * Add a request to the cache
	 * @param {ApiRequest} request
	 * @property{Promise<ApiResponse>} promise  The response promise for this request
	 * @param {String} method  The HTTP verb such as GET, POST, HEAD
	 * @param {String} url  The URL to request
	 * @param {String|Object|URLSearchParams} searchParams  The params in the URL
	 * @param {Number|String} cacheFor  The number of milliseconds or a string expression such as 2h, 20m, 30s
	 * @see https://github.com/jkroso/parse-duration#readme for supported caching expression
	 */
	add(request, promise) {
		const entry = {
			request,
			getPromise() {
				if (entry.resolution) {
					return Promise.resolve(entry.resolution);
				} else if (entry.rejection) {
					return Promise.reject(entry.rejection);
				} else {
					return promise;
				}
			},
		};
		promise.then(
			resolution => (entry.resolution = resolution),
			rejection => (entry.rejection = rejection)
		);
		this.entries.push(entry);
		const deleteAfter = this.getMilliseconds(request.options.cacheFor);
		setTimeout(() => {
			const idx = this.entries.indexOf(entry);
			if (idx > -1) {
				this.entries.splice(idx, 1);
			}
		}, deleteAfter);
	}

	/**
	 * Clear all cache, cache for a given method or cache for a method and url
	 * @param {String} [method]  The HTTP verb such as GET, POST, HEAD
	 * @param {String} [endpoint]  The endpoint that was requested
	 */
	clear(method = undefined, endpoint = undefined) {
		if (method === undefined && endpoint === undefined) {
			this.entries = [];
			return;
		}
		if (typeof method === 'string') {
			method = method.toUpperCase();
		}
		this.entries = this.entries.filter(entry => {
			return (
				!equalsOrMatches(entry.request.method, method) ||
				!equalsOrMatches(entry.request.endpoint, endpoint)
			);
		});
	}

	/**
	 * Given a cacheFor number or string, return the number of milliseconds to cache for
	 * @param {Number|String} cacheFor  Number of milliseconds or a string such as "45s", "5 minutes", "8h", "1d"
	 * @returns {Number}
	 */
	getMilliseconds(cacheFor) {
		if (typeof cacheFor === 'number') {
			return cacheFor;
		} else if (typeof cacheFor === 'string') {
			return parseDuration(cacheFor);
		} else {
			return 0;
		}
	}
}

module.exports = ApiCache;
