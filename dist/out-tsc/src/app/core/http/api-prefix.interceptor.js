import { __decorate } from "tslib";
/** Angular Imports */
import { Injectable } from '@angular/core';
/** Environment Configuration */
import { environment } from '../../../environments/environment';
/**
 * Http request interceptor to prefix a request with `environment.serverUrl`.
 */
let ApiPrefixInterceptor = class ApiPrefixInterceptor {
    /**
     * Intercepts a Http request and prefixes it with `environment.serverUrl`.
     */
    intercept(request, next) {
        request = request.clone({ url: environment.serverUrl + request.url });
        return next.handle(request);
    }
};
ApiPrefixInterceptor = __decorate([
    Injectable()
], ApiPrefixInterceptor);
export { ApiPrefixInterceptor };
//# sourceMappingURL=api-prefix.interceptor.js.map