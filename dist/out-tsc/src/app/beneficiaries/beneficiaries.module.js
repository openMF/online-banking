import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { BeneficiariesComponent } from './beneficiaries.component';
import { BeneficiariesListComponent } from './beneficiaries-list/beneficiaries-list.component';
import { SharedModule } from '../shared/shared.module';
import { BeneficiariesRoutingModule } from './beneficiaries-routing.module';
let BeneficiariesModule = class BeneficiariesModule {
};
BeneficiariesModule = __decorate([
    NgModule({
        declarations: [BeneficiariesComponent, BeneficiariesListComponent],
        imports: [
            SharedModule,
            BeneficiariesRoutingModule
        ]
    })
], BeneficiariesModule);
export { BeneficiariesModule };
//# sourceMappingURL=beneficiaries.module.js.map