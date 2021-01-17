import { NgModule } from '@angular/core';
import { BeneficiariesComponent } from './beneficiaries.component';
import { BeneficiariesListComponent } from './beneficiaries-list/beneficiaries-list.component';
import { SharedModule } from '../shared/shared.module';
import { BeneficiariesRoutingModule } from './beneficiaries-routing.module';
import { BeneficiariesFormComponent } from './beneficiaries-form/beneficiaries-form.component';



@NgModule({
  declarations: [BeneficiariesComponent, BeneficiariesListComponent, BeneficiariesFormComponent],
  imports: [
    SharedModule,
    BeneficiariesRoutingModule
  ]
})
export class BeneficiariesModule { }
