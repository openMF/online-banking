var CacheInterceptor_1;
import { __decorate } from "tslib";
/** Angular Imports */
import { Injectable } from '@angular/core';
import { HttpResponse } from '@angular/common/http';
/** rxjs Imports */
import { Observable } from 'rxjs';
/**
 * Caches HTTP requests.
 * Use ExtendedHttpClient fluent API to configure caching for each request.
 */
let CacheInterceptor = CacheInterceptor_1 = class CacheInterceptor {
    constructor(httpCacheService) {
        this.httpCacheService = httpCacheService;
        this.forceUpdate = false;
    }
    /**
     * Configures interceptor options
     * @param {{update: boolean}} options If update option is enabled, forces request to be made and updates cache entry.
     * @return {CacheInterceptor} The configured instance.
     */
    configure(options) {
        const instance = new CacheInterceptor_1(this.httpCacheService);
        if (options && options.update) {
            instance.forceUpdate = true;
        }
        return instance;
    }
    intercept(request, next) {
        if (request.method !== 'GET') {
            return next.handle(request);
        }
        return new Observable((subscriber) => {
            const cachedData = this.forceUpdate ? null : this.httpCacheService.getCacheData(request.urlWithParams);
            if (cachedData !== null) {
                // Create new response to avoid side-effects
                // tslint:disable-next-line:ban-types
                subscriber.next(new HttpResponse(cachedData));
                subscriber.complete();
            }
            else {
                next.handle(request)
                    .subscribe(event => {
                    if (event instanceof HttpResponse) {
                        this.httpCacheService.setCacheData(request.urlWithParams, event);
                    }
                    subscriber.next(event);
                }, error => subscriber.error(error), () => subscriber.complete());
            }
        });
    }
};
CacheInterceptor = CacheInterceptor_1 = __decorate([
    Injectable()
], CacheInterceptor);
export { CacheInterceptor };
//# sourceMappingURL=cache.interceptor.js.map