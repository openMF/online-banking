import { __decorate } from "tslib";
/** Angular Imports */
import { Injectable } from '@angular/core';
/**
 * Beneficiaries Resolver
 */
let TransfersResolver = class TransfersResolver {
    /**
     * @param {TransfersService} transferService service for beneficiaries endpoint
     */
    constructor(transferService) {
        this.transferService = transferService;
    }
    /**
     * Returns the list of accounts
     * @returns {Observable<any>}
     */
    resolve() {
        return this.transferService.getTransferTemplate();
    }
};
TransfersResolver = __decorate([
    Injectable()
], TransfersResolver);
export { TransfersResolver };
//# sourceMappingURL=transfers.resolver.js.map