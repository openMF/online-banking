import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AccountsComponent} from './accounts.component';
import { SavingsAccountDetailsComponent } from './savings-account-details/savings-account-details.component';
import { LoanAccountDetailsComponent } from './loan-account-details/loan-account-details.component';
import {SharedModule} from '../shared/shared.module';
import {AccountsRoutingModule} from './accounts-routing.module';
import {IconsModule} from '../shared/icons.module';
import { SavingsAccountsListComponent } from './savings-accounts-list/savings-accounts-list.component';
import { LoanAccountsListComponent } from './loan-accounts-list/loan-accounts-list.component';
import { ShareAccountsListComponent } from './share-accounts-list/share-accounts-list.component';




@NgModule({
  declarations: [AccountsComponent,
    SavingsAccountDetailsComponent,
    LoanAccountDetailsComponent,
    SavingsAccountsListComponent,
    LoanAccountsListComponent,
    ShareAccountsListComponent],
  imports: [
    SharedModule,
    AccountsRoutingModule,
    IconsModule
  ]
})
export class AccountsModule { }
