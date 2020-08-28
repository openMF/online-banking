import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
let BeneficiariesService = class BeneficiariesService {
    /**
     * @param {HttpClient} http Client for making requests
     */
    constructor(http) {
        this.http = http;
    }
    getBeneficiariesList() {
        return this.http.get('/beneficiaries/tpt');
    }
};
BeneficiariesService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], BeneficiariesService);
export { BeneficiariesService };
//# sourceMappingURL=beneficiaries.service.js.map