import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { SharedModule } from '../shared/shared.module';
import { TransfersComponent } from './transfers.component';
import { ReviewTransferDialogComponent } from './review-transfer-dialog/review-transfer-dialog.component';
import { TransfersRoutingModule } from './transfers-routing.module';
let TransfersModule = class TransfersModule {
};
TransfersModule = __decorate([
    NgModule({
        declarations: [TransfersComponent, ReviewTransferDialogComponent],
        imports: [
            SharedModule,
            TransfersRoutingModule
        ]
    })
], TransfersModule);
export { TransfersModule };
//# sourceMappingURL=transfers.module.js.map