import { __decorate } from "tslib";
/** Angular Imports */
import { Injectable } from '@angular/core';
/** Custom Services */
import { Logger } from '../logger/logger.service';
/** Initialize logger */
const log = new Logger('AuthenticationGuard');
/**
 * Route access authorization.
 */
let AuthenticationGuard = class AuthenticationGuard {
    /**
     * @param {Router} router Router for navigation.
     * @param {AuthenticationService} authenticationService Authentication Service.
     */
    constructor(router, authenticationService) {
        this.router = router;
        this.authenticationService = authenticationService;
    }
    /**
     * Ensures route access is authorized only when user is authenticated, otherwise redirects to login.
     *
     * @returns {boolean} True if user is authenticated.
     */
    canActivate() {
        if (this.authenticationService.isAuthenticated()) {
            return true;
        }
        log.debug('User not authenticated, redirecting to login...');
        console.log('Not authencticated, redirecting to login');
        this.authenticationService.logout();
        this.router.navigate(['/login'], { replaceUrl: true });
        return false;
    }
};
AuthenticationGuard = __decorate([
    Injectable()
], AuthenticationGuard);
export { AuthenticationGuard };
//# sourceMappingURL=authentication.guard.js.map