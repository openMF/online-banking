import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { Route } from '../core/route/route.service';

import { BeneficiariesComponent } from './beneficiaries.component';
import { BeneficiariesFormComponent } from './beneficiaries-form/beneficiaries-form.component';
import {extract} from '../core/i18n/i18n.service';
import { BeneficiariesResolver } from './beneficiaries.resolver';
import { BeneficiariesFormResolver } from './beneficiaries-form/beneficiariesFormResolver';

const routes: Routes = [
  Route.withShell([
    {
      path: 'beneficiaries',
      component: BeneficiariesComponent,
      data: {title: extract('Beneficiaries')},
      resolve: { beneficiaries: BeneficiariesResolver}},
    {
      path: 'beneficiaries/create',
      component: BeneficiariesFormComponent,
      data: {title: extract('Add Beneficiary')},
      resolve: { accountTypeOptions: BeneficiariesFormResolver}},
    {
      path: 'beneficiaries/edit',
      component: BeneficiariesFormComponent,
      data: {title: extract('Edit Beneficiary')},
      resolve: { accountTypeOptions: BeneficiariesFormResolver}}
  ])
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [
    BeneficiariesResolver,
    BeneficiariesFormResolver
  ]
})
export class BeneficiariesRoutingModule { }
