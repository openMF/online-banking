import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RecentTransactionsComponent } from './recent-transactions/recent-transactions.component';
import { SharedModule } from '../shared/shared.module';
import { RecentTransactionsRoutingModule } from './recent-transactions-routing.module';
let RecentTransactionsModule = class RecentTransactionsModule {
};
RecentTransactionsModule = __decorate([
    NgModule({
        declarations: [RecentTransactionsComponent],
        imports: [
            SharedModule,
            RecentTransactionsRoutingModule
        ]
    })
], RecentTransactionsModule);
export { RecentTransactionsModule };
//# sourceMappingURL=recent-transactions.module.js.map