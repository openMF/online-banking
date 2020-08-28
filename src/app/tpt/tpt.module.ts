import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { TptComponent } from './tpt/tpt.component';
import { ReviewTptDialogComponent } from './review-tpt-dialog/review-tpt-dialog.component';
import { SharedModule } from '../shared/shared.module';
import { TptRoutingModule } from './tpt-routing.module';



@NgModule({
  declarations: [TptComponent, ReviewTptDialogComponent],
  imports: [
    SharedModule,
    TptRoutingModule
  ]
})
export class TptModule { }
