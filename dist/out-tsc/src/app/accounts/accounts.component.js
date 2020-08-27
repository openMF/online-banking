import { __decorate } from "tslib";
import { Component } from '@angular/core';
let AccountsComponent = class AccountsComponent {
    constructor(route, router) {
        this.route = route;
        this.router = router;
        this.route.data.subscribe((data) => {
            this.loanAccounts = data.accounts.loanAccounts;
            this.savingsAccounts = data.accounts.savingsAccounts;
            this.shareAccounts = data.accounts.shareAccounts;
        });
    }
    ngOnInit() {
    }
};
AccountsComponent = __decorate([
    Component({
        selector: 'online-banking-accounts',
        templateUrl: './accounts.component.html',
        styleUrls: ['./accounts.component.css']
    })
], AccountsComponent);
export { AccountsComponent };
//# sourceMappingURL=accounts.component.js.map