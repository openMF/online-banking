import { async, TestBed } from '@angular/core/testing';
import { ReviewTransferDialogComponent } from './review-transfer-dialog.component';
describe('ReviewTransferDialogComponent', () => {
    let component;
    let fixture;
    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ReviewTransferDialogComponent]
        })
            .compileComponents();
    }));
    beforeEach(() => {
        fixture = TestBed.createComponent(ReviewTransferDialogComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });
    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
//# sourceMappingURL=review-transfer-dialog.component.spec.js.map