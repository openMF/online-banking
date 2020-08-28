import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Route } from '../core/route/route.service';
import { TransfersComponent } from './transfers.component';
import { extract } from '../core/i18n/i18n.service';
import { TransfersResolver } from './transfers.resolver';
const routes = [
    Route.withShell([
        {
            path: 'transfers',
            component: TransfersComponent,
            data: { title: extract('Transfers') },
            resolve: { transferTemplate: TransfersResolver }
        },
    ])
];
let TransfersRoutingModule = class TransfersRoutingModule {
};
TransfersRoutingModule = __decorate([
    NgModule({
        imports: [RouterModule.forChild(routes)],
        exports: [RouterModule],
        providers: [TransfersResolver
        ]
    })
], TransfersRoutingModule);
export { TransfersRoutingModule };
//# sourceMappingURL=transfers-routing.module.js.map