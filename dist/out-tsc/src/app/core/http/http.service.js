var HttpService_1;
import { __decorate, __param } from "tslib";
/** Angular Imports */
import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import { HttpClient } from '@angular/common/http';
/** Custom Interceptors */
import { ErrorHandlerInterceptor } from './error-handler.interceptor';
import { CacheInterceptor } from './cache.interceptor';
import { ApiPrefixInterceptor } from './api-prefix.interceptor';
/**
 *  From @angular/common/http/src/interceptor: allows to chain interceptors
 */
class HttpInterceptorHandler {
    constructor(next, interceptor) {
        this.next = next;
        this.interceptor = interceptor;
    }
    handle(request) {
        return this.interceptor.intercept(request, this.next);
    }
}
/**
 * Allows to override default dynamic interceptors that can be disabled with the HttpService extension.
 * Except for very specific needs, you should better configure these interceptors directly in the constructor below
 * for better readability.
 *
 * For static interceptors that should always be enabled (like ApiPrefixInterceptor), use the standard
 * HTTP_INTERCEPTORS token.
 */
export const HTTP_DYNAMIC_INTERCEPTORS = new InjectionToken('HTTP_DYNAMIC_INTERCEPTORS');
/**
 * Extends HttpClient with per request configuration using dynamic interceptors.
 */
let HttpService = HttpService_1 = class HttpService extends HttpClient {
    constructor(httpHandler, injector, interceptors = []) {
        super(httpHandler);
        this.httpHandler = httpHandler;
        this.injector = injector;
        this.interceptors = interceptors;
        if (!this.interceptors) {
            // Configure default interceptors that can be disabled here
            this.interceptors = [
                this.injector.get(ApiPrefixInterceptor),
                this.injector.get(ErrorHandlerInterceptor)
            ];
        }
    }
    cache(forceUpdate) {
        const cacheInterceptor = this.injector.get(CacheInterceptor).configure({ update: forceUpdate });
        return this.addInterceptor(cacheInterceptor);
    }
    skipErrorHandler() {
        return this.removeInterceptor(ErrorHandlerInterceptor);
    }
    disableApiPrefix() {
        return this.removeInterceptor(ApiPrefixInterceptor);
    }
    /**
     *  Override the original method to wire interceptors when triggering the request.
     */
    request(method, url, options) {
        const handler = this.interceptors.reduceRight((next, interceptor) => new HttpInterceptorHandler(next, interceptor), this.httpHandler);
        return new HttpClient(handler).request(method, url, options);
    }
    removeInterceptor(interceptorType) {
        return new HttpService_1(this.httpHandler, this.injector, this.interceptors.filter(i => !(i instanceof interceptorType)));
    }
    addInterceptor(interceptor) {
        return new HttpService_1(this.httpHandler, this.injector, this.interceptors.concat([interceptor]));
    }
};
HttpService = HttpService_1 = __decorate([
    Injectable(),
    __param(2, Optional()), __param(2, Inject(HTTP_DYNAMIC_INTERCEPTORS))
], HttpService);
export { HttpService };
//# sourceMappingURL=http.service.js.map