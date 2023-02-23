/* istanbul ignore next @preserve */
class FetchMocker {
	#handlers = [];
	#jestMock;
	#nativeFetch;
	fetchMocker = (url, options = {}) => {
		if (!options.method) {
			options.method = 'GET';
		}
		options.method = options.method.toUpperCase();
		for (const handler of this.#handlers) {
			if (handler.url !== url || options.method !== handler.method) {
				continue;
			}
			return new Promise((resolve, reject) => {
				if (handler.body && typeof handler.body === 'object') {
					handler.body = JSON.stringify(handler.body);
					const hasContentType = Object.keys(handler.headers)
						.map(t => t.toLowerCase())
						.includes('content-type');
					if (!hasContentType) {
						handler.headers['Content-Type'] = 'application/json;charset=UTF-8';
					}
				}
				setTimeout(() => {
					const resp = new Response(handler.body, {
						headers: handler.headers,
						status: handler.status,
					});
					if (options.signal?.aborted) {
						resp.aborted = true;
						reject(resp);
					} else {
						resolve(resp);
					}
				}, handler.delay);
			});
		}
		return this.#nativeFetch(url, options);
	};
	spyOnFetch = () => {
		if (!this.#jestMock) {
			this.#nativeFetch = global.fetch;
			this.#jestMock = jest
				.spyOn(global, 'fetch')
				.mockImplementation(this.fetchMocker);
		}
		return this;
	};
	clearFetchMocks = () => {
		this.#handlers = [];
	};
	stopMockingFetch = () => {
		this.#jestMock?.mockRestore();
	};
	mockResponse = ({
		url,
		method = 'GET',
		status = 200,
		headers = {},
		body = null,
		delay = 0,
	}) => {
		this.spyOnFetch();
		this.#handlers.push({
			url,
			method: method.toUpperCase(),
			status,
			headers,
			body,
			delay,
		});
		return this;
	};
}

module.exports = new FetchMocker();
