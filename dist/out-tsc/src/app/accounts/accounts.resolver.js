import { __decorate } from "tslib";
/** Angular Imports */
import { Injectable } from '@angular/core';
/**
 * Accounts List Resolver
 */
let AccountsResolver = class AccountsResolver {
    /**
     * @param accountsService
     */
    constructor(accountsService) {
        this.accountsService = accountsService;
    }
    /**
     * Returns the list of accounts
     * @returns {Observable<any>}
     */
    resolve() {
        return this.accountsService.getAccounts();
    }
};
AccountsResolver = __decorate([
    Injectable()
], AccountsResolver);
export { AccountsResolver };
//# sourceMappingURL=accounts.resolver.js.map