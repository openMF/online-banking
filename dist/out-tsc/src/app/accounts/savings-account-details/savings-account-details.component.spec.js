import { async, TestBed } from '@angular/core/testing';
import { SavingsAccountDetailsComponent } from './savings-account-details.component';
describe('SavingsAccountDetailsComponent', () => {
    let component;
    let fixture;
    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [SavingsAccountDetailsComponent]
        })
            .compileComponents();
    }));
    beforeEach(() => {
        fixture = TestBed.createComponent(SavingsAccountDetailsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });
    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
//# sourceMappingURL=savings-account-details.component.spec.js.map