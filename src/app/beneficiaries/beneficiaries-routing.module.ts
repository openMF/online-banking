import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { Route } from '../core/route/route.service';

import { BeneficiariesComponent } from './beneficiaries.component';
import {extract} from '../core/i18n/i18n.service';
import { BeneficiariesResolver } from './beneficiaries.resolver';

const routes: Routes = [
  Route.withShell([
    {
      path: 'beneficiaries',
      component: BeneficiariesComponent,
      data: {title: extract('Beneficiaries')},
      resolve: { beneficiaries: BeneficiariesResolver}},
  ])
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [BeneficiariesResolver
  ]
})
export class BeneficiariesRoutingModule { }

