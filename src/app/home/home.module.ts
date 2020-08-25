import { NgModule } from '@angular/core';

import { HomeComponent } from './home.component';
import { HomeRoutingModule } from './home-routing.module';
import { SavingsOverviewPieComponent } from './savings-overview-pie/savings-overview-pie.component';
import { LoanOverviewPieComponent } from './loan-overview-pie/loan-overview-pie.component';
import { ShareOverviewPieComponent } from './share-overview-pie/share-overview-pie.component';
import {SharedModule} from '../shared/shared.module';


@NgModule({
  declarations: [HomeComponent, SavingsOverviewPieComponent, LoanOverviewPieComponent, ShareOverviewPieComponent],
  imports: [
    SharedModule,
    HomeRoutingModule,
  ]
})
export class HomeModule { }
