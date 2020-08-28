import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ChargesListComponent } from './charges-list/charges-list.component';
import { SharedModule } from '../shared/shared.module';
import { ChargesRoutingModule } from './charges-routing.module';



@NgModule({
  declarations: [ChargesListComponent],
  imports: [
    SharedModule,
    ChargesRoutingModule
  ]
})
export class ChargesModule { }
