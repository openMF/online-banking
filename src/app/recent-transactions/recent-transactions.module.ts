import { NgModule } from '@angular/core';
import { RecentTransactionsComponent } from './recent-transactions/recent-transactions.component';
import { SharedModule } from '../shared/shared.module';
import { RecentTransactionsRoutingModule } from './recent-transactions-routing.module';



@NgModule({
  declarations: [RecentTransactionsComponent],
  imports: [
    SharedModule,
    RecentTransactionsRoutingModule
  ]
})
export class RecentTransactionsModule { }
