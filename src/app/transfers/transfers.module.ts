import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { TransfersComponent } from './transfers.component';
import { ReviewTransferDialogComponent } from './review-transfer-dialog/review-transfer-dialog.component';
import { TransfersRoutingModule } from './transfers-routing.module';



@NgModule({
  declarations: [TransfersComponent, ReviewTransferDialogComponent],
  imports: [
    SharedModule,
    TransfersRoutingModule
  ]
})
export class TransfersModule { }
