import { NgModule } from '@angular/core';
import { Route } from '../core/route/route.service';
import { Routes, RouterModule } from '@angular/router';

import { ApplyLoanComponent } from './apply-loan/apply-loan.component';
import { ApplyLoanResolver } from './applyLoan.resolver';
import {extract} from '../core/i18n/i18n.service';

const routes: Routes = [
  Route.withShell([
    {
      path: 'loans/apply',
      component: ApplyLoanComponent,
      data: {title: extract('Apply for Loan')},
      resolve: { productOptions: ApplyLoanResolver}
    },
  ])
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [
    ApplyLoanResolver
  ]
})
export class LoanRoutingModule { }
