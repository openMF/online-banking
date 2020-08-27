import { __decorate } from "tslib";
/** Angular Imports */
import { Injectable } from '@angular/core';
/**
 * Transactions List Resolver
 */
let RecentTransactionsResolver = class RecentTransactionsResolver {
    /**
     * @param {RecentTransactionsService} recentTransactionsService
     */
    constructor(recentTransactionsService) {
        this.recentTransactionsService = recentTransactionsService;
    }
    /**
     * Returns the list of Recent transactions
     * @returns {Observable<any>}
     */
    resolve() {
        return this.recentTransactionsService.getClientTransactions();
    }
};
RecentTransactionsResolver = __decorate([
    Injectable()
], RecentTransactionsResolver);
export { RecentTransactionsResolver };
//# sourceMappingURL=recent-transactions.resolver.js.map