import { NgModule } from '@angular/core';
import { BeneficiariesComponent } from './beneficiaries.component';
import { BeneficiariesListComponent } from './beneficiaries-list/beneficiaries-list.component';
import { SharedModule } from '../shared/shared.module';
import { BeneficiariesRoutingModule } from './beneficiaries-routing.module';



@NgModule({
  declarations: [BeneficiariesComponent, BeneficiariesListComponent],
  imports: [
    SharedModule,
    BeneficiariesRoutingModule
  ]
})
export class BeneficiariesModule { }
