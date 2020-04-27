const parseDuration = require('parse-duration');
const isEqual = require('lodash/isEqual');

class ApiCache {
	/**
	 * Initialize requests array
	 */
	constructor() {
		this.requests = [];
	}

	/**
	 * Find cache entry by method, url and search params
	 * @param {String} method  The HTTP verb such as GET, POST, HEAD
	 * @param {String} url  The URL to request
	 * @param {String|Object} searchParams  The params in the URL
	 * @returns {Promise<ApiResponse>|null}  The promise object if found or null if not
	 */
	find(method, url, searchParams) {
		for (const request of this.requests) {
			if (
				request.method === method &&
				request.url === url &&
				isEqual(request.searchParams, searchParams)
			) {
				return request.promise;
			}
		}
		return null;
	}

	/**
	 * Add a request to the cache
	 * @param {Promise<ApiResponse>} promise  The response promise for this request
	 * @param {String} method  The HTTP verb such as GET, POST, HEAD
	 * @param {String} url  The URL to request
	 * @param {String|Object} searchParams  The params in the URL
	 * @param {Number|String} cacheFor  The number of milliseconds or a string expression such as 2h, 20m, 30s
	 * @see https://github.com/jkroso/parse-duration#readme for supported caching expression
	 */
	add(promise, method, url, searchParams, cacheFor) {
		const item = { promise, method, url, searchParams };
		this.requests.push(item);
		setTimeout(() => {
			const idx = this.requests.indexOf(item);
			if (idx > -1) {
				this.requests.splice(idx, 1);
			}
		}, this.getMilliseconds(cacheFor));
	}

	/**
	 * Clear all cache, cache for a given method or cache for a method and url
	 * @param {String} [method]  The HTTP verb such as GET, POST, HEAD
	 * @param {String} [url]  The URL to request
	 */
	clear(method = undefined, url = undefined) {
		if (method === undefined && url === undefined) {
			this.requests = [];
			return;
		}
		this.requests = this.requests.filter(request => {
			return (
				!this._matches(request.method, method) ||
				!this._matches(request.url, url)
			);
		});
	}

	/**
	 * Check to see if the subject matches the given string or RegExp
	 * @param {String} subject  The string to test
	 * @param {String|RegExp|undefined} criteria  The string or regex to match against
	 * @returns {Boolean}  Return true on exact string match, regex match or undefined
	 * @private
	 */
	_matches(subject, criteria) {
		if (typeof criteria === 'string') {
			return subject === criteria;
		} else if (criteria instanceof RegExp) {
			return criteria.test(subject);
		}
		return true;
	}

	/**
	 * Given a cacheFor number or string, return the number of millseconds to cache for
	 * @param {Number|String} cacheFor  Number of milliseconds or a string such as 45s, 5m, 8h, 1d
	 * @returns {Number}
	 */
	getMilliseconds(cacheFor) {
		if (typeof cacheFor === 'number') {
			return cacheFor;
		}
		return parseDuration(cacheFor);
	}
}

module.exports = ApiCache;
