const ApiService = require('./Service/ApiService.js');
const api = require('./api.js');
const {
    get,
    post,
    head,
    put,
    patch,
    del,
    patchDifference,
    abort,
    submitJob,
    clearCache,
} = api;

describe('api instance', () => {
    it('should be an object instance', () => {
        expect(api).toBeInstanceOf(ApiService);
    });
});
describe('other exports', () => {
    it('should be functions', () => {
        expect(get).toBeInstanceOf(Function);
        expect(post).toBeInstanceOf(Function);
        expect(head).toBeInstanceOf(Function);
        expect(put).toBeInstanceOf(Function);
        expect(patch).toBeInstanceOf(Function);
        expect(del).toBeInstanceOf(Function);
        expect(patchDifference).toBeInstanceOf(Function);
        expect(abort).toBeInstanceOf(Function);
        expect(submitJob).toBeInstanceOf(Function);
        expect(clearCache).toBeInstanceOf(Function);
    });
});
