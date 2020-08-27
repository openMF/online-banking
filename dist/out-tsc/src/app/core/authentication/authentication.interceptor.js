import { __decorate } from "tslib";
/** Angular Imports */
import { Injectable } from '@angular/core';
/** Environment Configuration */
import { environment } from '../../../environments/environment';
/** Http request options headers. */
const httpOptions = {
    headers: {
        'Fineract-Platform-TenantId': environment.fineractPlatformTenantId
    }
};
/** Authorization header. */
const authorizationHeader = 'Authorization';
/**
 * Http Request interceptor to set the request headers.
 */
let AuthenticationInterceptor = class AuthenticationInterceptor {
    constructor() { }
    /**
     * Intercepts a Http request and sets the request headers.
     */
    intercept(request, next) {
        request = request.clone({ setHeaders: httpOptions.headers });
        return next.handle(request);
    }
    /**
     * Sets the basic/oauth authorization header depending on the configuration.
     * @param {string} authenticationKey Authentication key.
     */
    setAuthorizationToken(authenticationKey) {
        httpOptions.headers[authorizationHeader] = `Basic ${authenticationKey}`;
    }
    /**
     * Removes the authorization header.
     */
    removeAuthorization() {
        delete httpOptions.headers[authorizationHeader];
    }
};
AuthenticationInterceptor = __decorate([
    Injectable()
], AuthenticationInterceptor);
export { AuthenticationInterceptor };
//# sourceMappingURL=authentication.interceptor.js.map