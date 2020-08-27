import { __decorate } from "tslib";
import { Component } from '@angular/core';
let HomeComponent = class HomeComponent {
    constructor(homeService, route, router) {
        this.homeService = homeService;
        this.route = route;
        this.router = router;
        this.loanAccounts = [];
        this.savingsAccounts = [];
        this.shareAccounts = [];
        this.totalSavings = '0';
        this.totalLoan = '0';
        // TODO: Dim the screen while values are loading
        this.loading = true;
        this.route.data.subscribe((data) => {
            const { loanAccounts, savingsAccounts, shareAccounts } = data.accounts;
            this.loanAccounts = loanAccounts ? loanAccounts : [];
            this.savingsAccounts = savingsAccounts ? savingsAccounts : [];
            this.shareAccounts = shareAccounts ? shareAccounts : [];
        });
    }
    ngOnInit() {
        console.log('from ngoninit for home.component', 'loan Accounts ', this.loanAccounts, 'share Accounts ', this.shareAccounts, 'savings Accounts ', this.savingsAccounts);
        this.setAccounts();
    }
    setAccounts() {
        this.totalAccounts = this.loanAccounts.length + this.savingsAccounts.length + this.shareAccounts.length;
        console.log('From the set acounts method here is the total accounts', this.totalAccounts);
        let savingsBalance = 0;
        this.savingsAccounts.forEach((account) => {
            const { accountBalance } = account;
            if (accountBalance) {
                savingsBalance += parseInt(accountBalance, 10);
            }
        });
        this.totalSavings = savingsBalance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        let loansBalance = 0;
        this.loanAccounts.forEach((account) => {
            const { loanBalance } = account;
            if (loanBalance) {
                loansBalance += loanBalance;
            }
        });
        this.totalLoan = loansBalance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        this.loading = false;
    }
};
HomeComponent = __decorate([
    Component({
        selector: 'online-banking-home',
        templateUrl: './home.component.html',
        styleUrls: ['./home.component.scss']
    })
], HomeComponent);
export { HomeComponent };
//# sourceMappingURL=home.component.js.map