# api-client

JavaScript api client for use in React and Node

## Tell me more

Similar to our Angular ApiProvider but more intuitive. Target uses include:

- New React code
- API v4 endpoints written in JavaScript
- API integration testing (v2, v3, v4)
- Single-use scripts for reports or importing data (e.g. queries repo)

## Table of Contents

- [Request API](#request-api)
- [How endpoints work](#how-endpoints-work)
- [Response API](#response-api)
- [Handling Errors](#handling-errors)
- [Special Methods](#special-methods)
- [Aborting Requests](#aborting-requests)
- [Caching](#caching)
- [Interceptors](#interceptors)
- [APIRequest](#apirequest)

## Request API

Use the following key for the origin of each option:

- `[f]` From window.fetch - [docs](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch)
- `[S]` Custom Sharpr item
- `[k]` From ky - [docs](https://github.com/sindresorhus/ky)

```jsx harmony
const { request, head, get, post, del, put, patch } = request('api-client');
request(method, endpoint, params, kyOverrides);
head(endpoint, params, kyOverrides);
get(endpoint, params, kyOverrides);
post(endpoint, payload, kyOverrides);
del(endpoint, payload, kyOverrides);
put(endpoint, payload, kyOverrides);
patch(endpoint, payload, kyOverrides);
```

Where:

- `{String} method` GET, POST, DELETE, etc. `[f]`
- `{String} endpoint` The name of the API endpoint such as /posts/123 `[S]`
- `{Object} [paramsOrData]` For GET requests, the query params; otherwise JSON payload `[S]`
- `{Object} [kyOverrides]` Additional overrides including { headers } `[k]`
  - `{Object} headers` Any request headers `[f]`
  - `{Object} retry` ky retry options (default = no retries) see https://github.com/sindresorhus/ky#retry `[k]`
  - `{Number} timeout` The number of milliseconds after which to time out (default is 5 minutes) `[k]`
  - `{Boolean} throwHttpErrors` If false, resolve non-2xx responses instead of rejecting (default = true) `[k]`
  - `{Function} onDownloadProgress: (progress, chunk)` see https://github.com/sindresorhus/ky#ondownloadprogress `[k]`
  - `{Boolean} avoidLoadingBar` If true, do not show loading bar (React only) `[S]`
    Returns:

A promise that resolves with `ApiResponse` or rejects with `ApiError`.

## How endpoints and URLs work

On sharpr.com:

- `/posts/123` Is changed to `https://sharpr.com/api/v2/posts/123`
- `/v3/posts/search` Is changed to `https://sharpr.com/api/v3/posts/search`
- `https://sharprua.com/status/tests.php` Is left alone

When using api-client in Node or fetching from external domains, URLs need to
start with the full domain or else you can set a default using `setBaseURL()`:

```js
api.setBaseURL('https://example.com');
```

## Response API

`ApiResponse` is a custom Sharpr class to make it easier to work with responses.

- `{Object} request` The original request object that was passed to ky `[k]`
  - `{String} url` A raw URL to use instead of the endpoint `[S]`
  - `{String} method` GET, POST, DELETE, etc. `[f]`
  - `{Object} searchParams` params that were serialized into the GET string `[k]`
  - `{Object} headers` Any request headers `[f]`
  - `{*} json` The JSON payload `[k]`
  - `{Object} retry` ky retry options `[k]`
  - `{Number} timeout` The number of milliseconds after which to time out `[k]`
  - `{Boolean} throwHttpErrors` If false, resolve non-2xx responses instead of rejecting `[k]`
  - `{Function} onDownloadProgress: (progress, chunk)` see https://github.com/sindresorhus/ky#ondownloadprogress
  - `{Boolean} avoidLoadingBar` If true, do not show loading bar `[S]`
- `{String} type` Either "json", "text" or null depending on response type `[S]`
- `{*} data` The decoded response or text `[S]`
- `{String} endpoint` The name of the API endpoint such as /posts/123 `[S]`
- `{Response} rawResponse` The raw `fetch` response `[S]`
- `{Boolean} ok` True if response is 2xx `[f]`
- `{Number} status` The status code `[f]`
- `{String} statusText` Status name such as "OK" or "No Content" `[f]`
- `{Headers} headers` Headers object with `get()`, `has()`, etc.
- `{Number} total` The value of `API-Total-Records` response header `[S]`
- `{Number} size` The number of items returned in Request.data `[S]`
- `{Number} limit` The `limit` param that was passed in `[S]`
- `{Number} page` The `page` param that was passed in `[S]`
- `{Number} numPages` The number of pages based on `total` and `limit` `[S]`
- `{Boolean} isEmpty` True if no records were returned `[S]`
- `{String} location` The value of the `Location` response header `[S]`
- `{String} contentType` The value of the `Content-Type` response header `[S]`
- `{String} contentLength` The value of the `Content-Length` response header `[S]`
- `{Array} notices` The parsed value of the `API-Response-Notices` response header `[S]`
- `{Array} errors` The parsed value of the `API-Response-Errors` response header `[S]`
- `{String} responseId` The value of the `API-Response-Id` response header `[S]`
- `{Number} newId` The value of the `API-New-Record-Id` response header `[S]`
- `{Number} time` The value of the `API-Response-Time` response header `[S]`

## Handling Errors

ApiError is a custom Sharpr class to make it easier to work with response errors.

```js
api.get('/hello').then(onSuccess, response => {
	// response is instance of ApiError
	// response.error is instance of Error
});
```

`ApiError` has the same properties of `ApiResponse` plus

- `{Error} error` The HTTPError or TimeoutError object `[S]`

## Special methods

The following methods are added for convenience:

- `patchDifference(endpoint, oldValues, newValues, kyOverrides)`
- `submitJob(endpoint, payload, kyOverrides)`

### Examples

`patchDifference` example:

```js
const currState = {
	fname: 'John',
	lname: 'Doe',
};
const newState = {
	fname: 'Johnny',
	lname: 'Doe',
};
api
	.patchDifference('/v2/users/123', currState, newState)
	.then(onSuccess, onError);
```

`submitJob` example:

```js
const jobInfo = {
	post_ids: [1, 2, 3, 4],
	action: 'destroy',
};
const onSuccess = response => {
	const recheckIntervalMs = 5000;
	response.onJobComplete(() => {
		alert('Posts were all deleted!');
	}, recheckIntervalMs);
};
api.submitJob('/v2/posts/massdelete', jobInfo).then(onSuccess, onError);
```

## Aborting requests

```js
const { abort, get } = require('api-client');

// abort all pending requests
abort();
// abort all pending GET requests
abort('get');
// abort all pending GET /posts/123 requests
abort('get', '/posts/123');
// abort a specific request
const promise = get('/posts/123');
abort(promise);
```

## Hooks

There are some api-related hooks that can be used with React components:

1. `useApiGet(endpoint, params, kyOptions)`
1. `useApiGetAll(endpointArgSets)`
1. `useApiEndpoint(verb, endpoint)`

### useApiGet

Example:

```jsx harmony
export function MyComponent() {
	const { isLoading, hasError, response } = useApiGet(
		'https://httpbin.org/get?a=1'
	);
	return (
		<div>
			{isLoading && <Loader size={16} />}
			{hasError && <div>Error fetching data</div>}
			{response && <div>a equals {response.data.args.a}</div>}
		</div>
	);
}
```

### Consolidating multiple useApiGet calls using withResponses

Example:

```jsx harmony
import useApiGet from '../../libs/api/hooks/useApiGet/useApiGet.js';
import withResponses from '../../libs/api/middleware/withResponses/withResponses.js';
export function MyComponent() {
	const { isLoading, hasError, responses } = withResponses([
		useApiGet('https://httpbin.org/get', { a: 1 }),
		useApiGet('https://httpbin.org/get', { b: 2 }),
	]);
	return (
		<div>
			{isLoading && <Loader size={16} />}
			{hasError && <div>Error fetching data</div>}
			{responses &&
				responses.map((response, i) => (
					<div key={i}>{JSON.stringify(response.data.args)}</div>
				))}
		</div>
	);
}
```

### useApiEndpoint

Example:

```jsx harmony
export function MyComponent() {
	const verb = 'get';
	const endpoint = '/v3/posts/search';
	const { isLoading, hasError, response, request, abort } = useApiEndpoint(
		verb,
		endpoint
	);
	const [term, setTerm] = useState('');
	const doSearch = () => {
		abort(); // abort any incomplete request
		request({ term }); // make a request
	};
	return (
		<div>
			<form onSubmit={doSearch}>
				Search Posts:
				<input value={term} onChange={e => setTerm(e.target.value)} />
				<button>Go</button>
			</form>
			{isLoading && <Loader size={16} />}
			{hasError && <div>Error fetching data</div>}
			{response &&
				response.data.map(post => (
					<div key={post.id}>
						{post.headline} - {post.summary}
					</div>
				))}
		</div>
	);
}
```

## Caching

To cache a response for later, use the `cacheFor` option.

`cacheFor` may be a number of milliseconds or a time expression such as the following:

- `1d` => 1 day
- `8h` => 8 hours
- `20m` => 20 minutes
- `30s` => 30 seconds
- `300ms` => 300 milliseconds
- `3h 20m` => 3 hours, 20 minutes

See [parse-duration](https://github.com/jkroso/parse-duration#readme) on npm for
more supported expressions.

Example:

```js
const result1 = api.get('/abc', { d: 4 }, { cacheFor: '2h' });
// ... 1 hour later ...
const result2 = api.get('/abc', { d: 4 }, { cacheFor: '2h' });
// result1 === result2
```

## Interceptors

- `request` interceptors receive an ApiRequest object:
- `response` interceptors receive an ApiRequest and ApiResponse object:
- `error`, `timeout` and `abort` interceptors receive an ApiRequest an ApiError object:

```js
api.addInterceptor({
	request: (request, api) => {},
	response: (request, response, api) => {},
	error: (request, error, api) => {},
	timeout: (request, error, api) => {},
	abort: (request, error, api) => {},
});
```

## ApiRequest

| Property      | Type    | Description                                 | Examples                        |
| ------------- | ------- | ------------------------------------------- | ------------------------------- |
| `method`      | String  | The HTTP verb uppercase                     | GET, POST                       |
| `endpoint`    | String  | The Sharpr endpoint                         | /v3/users/me                    |
| `params`      | Object  | The params to send in the URL               | `{a: '1'}`                      |
| `data`        | Object  | The payload to be sent                      | `{ a: 1 }`                      |
| `options`     | Object  | The ky and caching options                  | `{ cacheFor: '15m' }`           |
| `headers`     | Headers | Headers to be sent                          | `new Headers({ a: '1'})`        |
| `queryString` | String  | The URL query string based on `params`      | a=1&b=2                         |
| `url`         | String  | The full URL to be sent                     | https://example.com/abc?a=1&b=2 |
| `pending`     | Boolean | True when request started but not completed | false                           |
| `completed`   | Boolean | True when request has completed             | true                            |

| Method    | Returns | Description             |
| --------- | ------- | ----------------------- |
| `abort()` | void    | Abort a pending request |
| `send()`  | Promise | A promise from ky       |
