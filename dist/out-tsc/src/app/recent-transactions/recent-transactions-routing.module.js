import { __decorate } from "tslib";
import { Route } from "../core/route/route.service";
import { RecentTransactionsComponent } from './recent-transactions/recent-transactions.component';
import { extract } from '../core/i18n/i18n.service';
import { RecentTransactionsResolver } from './recent-transactions.resolver';
import { RouterModule } from '@angular/router';
import { NgModule } from '@angular/core';
const routes = [
    Route.withShell([
        {
            path: 'recent-transactions',
            component: RecentTransactionsComponent,
            data: { title: extract('Recent Transactions') },
            resolve: { transactions: RecentTransactionsResolver }
        },
    ])
];
let RecentTransactionsRoutingModule = class RecentTransactionsRoutingModule {
};
RecentTransactionsRoutingModule = __decorate([
    NgModule({
        imports: [RouterModule.forChild(routes)],
        exports: [RouterModule],
        providers: [
            RecentTransactionsResolver
        ]
    })
], RecentTransactionsRoutingModule);
export { RecentTransactionsRoutingModule };
//# sourceMappingURL=recent-transactions-routing.module.js.map