import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { Route } from '../core/route/route.service';

import { AccountsComponent } from './accounts.component';
import {extract} from '../core/i18n/i18n.service';
import {AccountsResolver} from './accounts.resolver';

const routes: Routes = [
  Route.withShell([
    {
      path: 'accounts',
      component: AccountsComponent,
      data: {title: extract('Accounts')},
      resolve: { accounts: AccountsResolver}},
  ])
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [AccountsResolver
  ]
})
export class AccountsRoutingModule { }

