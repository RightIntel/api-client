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
				// console.log("................ handler didn't match", {
				// 	handlerUrl: handler.url,
				// 	url,
				// 	handlerMethod: handler.method,
				// 	method: options.method,
				// });
				continue;
			}
			// console.log('................ handler MATCHED', handler);
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
				// console.log('................ setting timeout', handler.delay);
				setTimeout(() => {
					// console.log('................ in timeout', options.signal);
					const resp = new Response(handler.body, {
						headers: handler.headers,
						status: handler.status,
					});
					if (options.signal?.aborted) {
						// console.log('................ rejecting aborted request', resp);
						resp.aborted = true;
						reject(resp);
					} else {
						// console.log('................ resolving response', resp);
						resolve(resp);
					}
				}, handler.delay);
			});
		}
		// console.log('>>>>>>>>>>>>>>>> using native fetch');
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
		// console.log('======================== clearFetchMocks');
		this.#handlers = [];
	};
	stopMockingFetch = () => {
		// console.log('======================== stopMockingFetch');
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
