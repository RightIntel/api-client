# api-client

JavaScript api client for use in React and Node

# Tell me more

Similar to our Angular ApiProvider but more intuitive. Target uses include:

- New React code
- API v4 endpoints written in JavaScript
- API integration testing (v2, v3, v4)

## Key

Use the following key for the origin of each option:

- `[f]` From window.fetch - [docs](https://developer.mozilla.org/en-US/docs/Web/API/WindowOrWorkerGlobalScope/fetch)
- `[S]` Custom Sharpr item
- `[k]` From ky - [docs](https://github.com/sindresorhus/ky)

## Requests

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

## How endpoints work

On sharpr.com:

- `/posts/123` Is changed to `https://sharpr.com/api/v2/posts/123`
- `/v3/posts/search` Is changed to `https://sharpr.com/api/v3/posts/search`
- `https://sharprua.com/status/tests.php` Is left alone

For other stacks or vanity domains, the proper domain will be used.

## ApiResponse

A custom Sharpr class to make it easier to work with responses.

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

## ApiError

A custom Sharpr class to make it easier to work with response errors.

All the same properties of `ApiResponse` plus

- `{Error} error` The HTTPError or TimeoutError object `[S]`

## Special methods

The following methods are added for convenience:

- `patchDifference(endpoint, oldValues, newValues, kyOverrides)`
- `submitJob(endpoint, payload, kyOverrides)`

### Examples

`patchDifference` example:

```jsx harmony
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

```jsx harmony
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

```jsx harmony
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
  const { isLoading, hasError, response, request, abort } = useApiEndpoint(verb, endpoint);
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
      {response && (
        response.data.map((post, i) => (
          <div key={i}>{post.headline}</div>
        )
      }
    </div>
  );
}
```

## Interceptors

`request` interceptors receive an object with the following props:

- endpoint {String} The endpoint string as it was passed in
- request {Object} Request options to pass to ky
- abortController {AbortController} Call .cancel() to abort request

`response` interceptors receive an object with the following props:

- endpoint {String} The endpoint string as it was passed in
- request {Object} Request options that were passed to ky
- response {ApiResponse} The final response

`error` interceptors receive an object with the following props:

- error {Error} The HTTPError or TimeoutError
- endpoint {String} The endpoint string as it was passed in
- request {Object} Request options that were passed to ky
- response {ApiError} The final response
