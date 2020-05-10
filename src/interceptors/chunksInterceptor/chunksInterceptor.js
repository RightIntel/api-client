const chunkString = require('@shelf/fast-chunk-string');

const chunksInterceptor = { request };
module.exports = chunksInterceptor;

/**
 * Split long headers into chunks
 * @param {ApiRequest} request
 */
function request(request) {
	// Split long headers into chunks because Apache has a max of 8192 bytes per header
	const headerMaxLength = 8000;
	// (e.g. "Hubs" header can get really long for superadmins)
	// see api2->loadRequestHeaders()
	for (const name in request.headers) {
		// istanbul ignore next
		if (!request.headers.hasOwnProperty(name)) {
			continue;
		}
		const value = request.headers[name];
		if (
			!value ||
			typeof value !== 'string' ||
			value.length <= headerMaxLength
		) {
			// header is short
			return;
		}
		// header is too long; chunk it into pieces
		chunkString(value, { size: headerMaxLength }).forEach((chunk, i) => {
			request.headers[`${name}-Chunk-${i}`] = chunk;
		});
		// delete the original header
		request.headers[name] = undefined;
	}
}
