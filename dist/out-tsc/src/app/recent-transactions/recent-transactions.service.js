import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
let RecentTransactionsService = class RecentTransactionsService {
    /**
     * @param {HttpClient} http Client for sending requests
     * @param {AuthenticationService} authenticationService Service to obtain authentication details
     */
    constructor(http, authenticationService) {
        this.http = http;
        this.authenticationService = authenticationService;
    }
    getClientTransactions() {
        const userId = this.authenticationService.getCredentials().userId;
        return this.http.get(`/self/clients/${userId}/transactions`);
    }
};
RecentTransactionsService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], RecentTransactionsService);
export { RecentTransactionsService };
//# sourceMappingURL=recent-transactions.service.js.map