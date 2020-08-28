import { __decorate } from "tslib";
import { Injectable } from '@angular/core';
let TransfersService = class TransfersService {
    constructor(http) {
        this.http = http;
    }
    getTransferTemplate() {
        return this.http.get('/self/accounttransfers/template');
    }
    createNewTransfer(body) {
        return this.http.post('/self/accounttransfers', body);
    }
};
TransfersService = __decorate([
    Injectable({
        providedIn: 'root'
    })
], TransfersService);
export { TransfersService };
//# sourceMappingURL=transfers.service.js.map