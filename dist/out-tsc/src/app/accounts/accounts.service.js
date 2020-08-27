import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
let AccountsService = class AccountsService {
    /**
     * @param {HttpClient} http Client for sending requests
     * @param {AuthenticationService} authenticationService Service for obtaining authentication details
     */
    constructor(http, authenticationService) {
        this.http = http;
        this.authenticationService = authenticationService;
    }
    getAccounts() {
        const userId = this.authenticationService.getCredentials().userId;
        return this.http.get(`/self/clients/${userId}/accounts`);
    }
};
AccountsService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], AccountsService);
export { AccountsService };
//# sourceMappingURL=accounts.service.js.map