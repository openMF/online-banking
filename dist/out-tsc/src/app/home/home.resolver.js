import { __decorate } from "tslib";
/** Angular Imports */
import { Injectable } from '@angular/core';
/**
 * Accounts List Resolver
 */
let HomeResolver = class HomeResolver {
    /**
     * @param homeService
     */
    constructor(homeService) {
        this.homeService = homeService;
    }
    /**
     * Returns the list of accounts
     * @returns {Observable<any>}
     */
    resolve() {
        return this.homeService.getAccounts();
    }
};
HomeResolver = __decorate([
    Injectable()
], HomeResolver);
export { HomeResolver };
//# sourceMappingURL=home.resolver.js.map