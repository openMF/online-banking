import { __decorate } from "tslib";
/** Angular Imports */
import { Injectable } from '@angular/core';
/**
 * Beneficiaries Resolver
 */
let BeneficiariesResolver = class BeneficiariesResolver {
    /**
     * @param {BeneficiariesService} beneficiariesService service for beneficiaries endpoint
     */
    constructor(beneficiariesService) {
        this.beneficiariesService = beneficiariesService;
    }
    /**
     * Returns the list of accounts
     * @returns {Observable<any>}
     */
    resolve() {
        return this.beneficiariesService.getBeneficiariesList();
    }
};
BeneficiariesResolver = __decorate([
    Injectable()
], BeneficiariesResolver);
export { BeneficiariesResolver };
//# sourceMappingURL=beneficiaries.resolver.js.map