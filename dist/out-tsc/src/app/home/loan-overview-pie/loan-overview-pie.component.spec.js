import { async, TestBed } from '@angular/core/testing';
import { LoanOverviewPieComponent } from './loan-overview-pie.component';
describe('LoanOverviewPieComponent', () => {
    let component;
    let fixture;
    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [LoanOverviewPieComponent]
        })
            .compileComponents();
    }));
    beforeEach(() => {
        fixture = TestBed.createComponent(LoanOverviewPieComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });
    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
//# sourceMappingURL=loan-overview-pie.component.spec.js.map