import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { Route } from '../core/route/route.service';

import { TransfersComponent } from './transfers.component';
import {extract} from '../core/i18n/i18n.service';
import { TransfersResolver } from './transfers.resolver';
import { ReviewTransferDialogComponent } from './review-transfer-dialog/review-transfer-dialog.component';

const routes: Routes = [
  Route.withShell([
    {
      path: 'transfers',
      component: TransfersComponent,
      data: {title: extract('Transfers')},
      resolve: { transferTemplate: TransfersResolver }},
      {
        path: 'review-transfer',
        component: ReviewTransferDialogComponent,
        data: {title: extract('Review Transfer')}
      }
  ])
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [TransfersResolver
  ]
})
export class TransfersRoutingModule { }

