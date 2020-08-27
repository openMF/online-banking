import { async, TestBed } from '@angular/core/testing';
import { BeneficiariesListComponent } from './beneficiaries-list.component';
describe('BeneficiariesListComponent', () => {
    let component;
    let fixture;
    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [BeneficiariesListComponent]
        })
            .compileComponents();
    }));
    beforeEach(() => {
        fixture = TestBed.createComponent(BeneficiariesListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });
    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
//# sourceMappingURL=beneficiaries-list.component.spec.js.map