import { async, TestBed } from '@angular/core/testing';
import { LoanAccountsListComponent } from './loan-accounts-list.component';
describe('LoanAccountsListComponent', () => {
    let component;
    let fixture;
    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [LoanAccountsListComponent]
        })
            .compileComponents();
    }));
    beforeEach(() => {
        fixture = TestBed.createComponent(LoanAccountsListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });
    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
//# sourceMappingURL=loan-accounts-list.component.spec.js.map