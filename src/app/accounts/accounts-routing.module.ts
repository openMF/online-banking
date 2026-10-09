import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { Route } from '../core/route/route.service';

import { AccountsComponent } from './accounts.component';
import {extract} from '../core/i18n/i18n.service';
import {AccountsResolver} from './accounts.resolver';

import { SavingsAccountDetailsComponent } from './savings-account-details/savings-account-details.component';
import { LoanAccountDetailsComponent } from './loan-account-details/loan-account-details.component';
import { ShareAccountDetailsComponent } from './share-account-details/share-account-details.component';

const routes: Routes = [
  Route.withShell([
    {
      path: 'accounts',
      component: AccountsComponent,
      data: {title: extract('Accounts')},
      resolve: { accounts: AccountsResolver}
    },
    {
      path: 'accounts/savings/:id',
      component: SavingsAccountDetailsComponent,
      data: {title: extract('Savings Account Details')}
    },
    {
      path: 'accounts/loans/:id',
      component: LoanAccountDetailsComponent,
      data: {title: extract('Loan Account Details')}
    },
    {
      path: 'accounts/shares/:id',
      component: ShareAccountDetailsComponent,
      data: {title: extract('Share Account Details')}
    }
  ])
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [AccountsResolver
  ]
})
export class AccountsRoutingModule { }

