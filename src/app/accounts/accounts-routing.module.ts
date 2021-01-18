import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { Route } from '../core/route/route.service';

import { AccountsComponent } from './accounts.component';
import {extract} from '../core/i18n/i18n.service';
import {AccountsResolver} from './accounts.resolver';
import { SavingsAccountResolver } from './savings-account-details/savings-account.resolver';
import { SavingsAccountDetailsComponent } from './savings-account-details/savings-account-details.component'
import { LoanAccountDetailsComponent } from './loan-account-details/loan-account-details.component';
import { LoanAccountResolver } from './loan-account-details/loan-account.resolver'

const routes: Routes = [
  Route.withShell([
    {
      path: 'accounts',
      component: AccountsComponent,
      data: {title: extract('Accounts')},
      resolve: { accounts: AccountsResolver}},
    {
      path: 'accounts/savings',
      component: SavingsAccountDetailsComponent,
      data: {title: extract('Savings Account Details')},
      resolve: { accountDetails: SavingsAccountResolver}},
    {
      path: 'accounts/loan',
      component: LoanAccountDetailsComponent,
      data: {title: extract('Loan Account Details')},
      resolve: { accountDetails: LoanAccountResolver}}
  ])
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [
    AccountsResolver,
    SavingsAccountResolver,
    LoanAccountResolver
  ]
})
export class AccountsRoutingModule { }

