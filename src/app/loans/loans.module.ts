import { NgModule } from '@angular/core';

import { ApplyLoanComponent } from './apply-loan/apply-loan.component';
import { LoanRoutingModule } from './loans-routing.module';
import { ApplyLoanResolver } from './applyLoan.resolver';
import { SharedModule } from '../shared/shared.module';
import { ToastrModule } from 'ngx-toastr';

@NgModule({
  declarations: [ApplyLoanComponent],
  imports: [
    LoanRoutingModule,
    SharedModule,
    ToastrModule.forRoot({
      maxOpened: 1,
      timeOut: 2000,
      autoDismiss: true,
      progressBar: true,
      progressAnimation: 'increasing'
    })
  ],
  providers: [ ]
})
export class LoansModule { }
