import { __decorate } from "tslib";
import { Component } from '@angular/core';
let BeneficiariesComponent = class BeneficiariesComponent {
    constructor(route, router) {
        this.route = route;
        this.router = router;
        this.route.data.subscribe((data) => {
            this.beneficiaries = data.beneficiaries;
        });
    }
    ngOnInit() {
    }
};
BeneficiariesComponent = __decorate([
    Component({
        selector: 'online-banking-beneficiaries',
        templateUrl: './beneficiaries.component.html',
        styleUrls: ['./beneficiaries.component.css']
    })
], BeneficiariesComponent);
export { BeneficiariesComponent };
//# sourceMappingURL=beneficiaries.component.js.map