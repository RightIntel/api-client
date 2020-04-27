const ApiService = require('./Service/ApiService.js');
const chunksInterceptor = require('./interceptors/chunksInterceptor/chunksInterceptor.js');
const dateInterceptor = require('./interceptors/dateInterceptor/dateInterceptor.js');

// singleton instance
const api = new ApiService();

// add all the interceptors used by both node and react
api.addInterceptor(chunksInterceptor);
api.addInterceptor(dateInterceptor);

// export individual methods
api.get = api.get.bind(api);
api.post = api.post.bind(api);
api.head = api.head.bind(api);
api.put = api.put.bind(api);
api.patch = api.patch.bind(api);
api.del = api.delete.bind(api);
api.patchDifference = api.patchDifference.bind(api);
api.abort = api.abort.bind(api);
api.submitJob = api.submitJob.bind(api);

// export instance
module.exports = api;
