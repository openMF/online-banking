import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Route } from '../core/route/route.service';
import { AccountsComponent } from './accounts.component';
import { extract } from '../core/i18n/i18n.service';
import { AccountsResolver } from './accounts.resolver';
const routes = [
    Route.withShell([
        {
            path: 'accounts',
            component: AccountsComponent,
            data: { title: extract('Accounts') },
            resolve: { accounts: AccountsResolver }
        },
    ])
];
let AccountsRoutingModule = class AccountsRoutingModule {
};
AccountsRoutingModule = __decorate([
    NgModule({
        imports: [RouterModule.forChild(routes)],
        exports: [RouterModule],
        providers: [AccountsResolver
        ]
    })
], AccountsRoutingModule);
export { AccountsRoutingModule };
//# sourceMappingURL=accounts-routing.module.js.map