import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AboutUsComponent } from './about-us/about-us.component';
import { SharedModule } from '../shared/shared.module';
import { AboutUsRoutingModule } from './about-us-routing.module';



@NgModule({
  declarations: [AboutUsComponent],
  imports: [
    SharedModule,
    AboutUsRoutingModule
  ]
})
export class AboutUsModule { }
