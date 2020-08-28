import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
let HomeService = class HomeService {
    /**
     * @param {HttpClient} http Client for sending requests
     */
    constructor(http, authenticationService) {
        this.http = http;
        this.authenticationService = authenticationService;
    }
    getAccounts() {
        const userId = this.authenticationService.getCredentials().userId;
        console.log('From the home service get account method ', userId);
        return this.http.get(`/self/clients/${userId}/accounts`);
    }
};
HomeService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], HomeService);
export { HomeService };
//# sourceMappingURL=home.service.js.map