import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Route } from '../core/route/route.service';
import { BeneficiariesComponent } from './beneficiaries.component';
import { extract } from '../core/i18n/i18n.service';
import { BeneficiariesResolver } from './beneficiaries.resolver';
const routes = [
    Route.withShell([
        {
            path: 'beneficiaries',
            component: BeneficiariesComponent,
            data: { title: extract('Beneficiaries') },
            resolve: { beneficiaries: BeneficiariesResolver }
        },
    ])
];
let BeneficiariesRoutingModule = class BeneficiariesRoutingModule {
};
BeneficiariesRoutingModule = __decorate([
    NgModule({
        imports: [RouterModule.forChild(routes)],
        exports: [RouterModule],
        providers: [BeneficiariesResolver
        ]
    })
], BeneficiariesRoutingModule);
export { BeneficiariesRoutingModule };
//# sourceMappingURL=beneficiaries-routing.module.js.map