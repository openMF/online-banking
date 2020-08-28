import { async, TestBed } from '@angular/core/testing';
import { SavingsAccountsListComponent } from './savings-accounts-list.component';
describe('SavingsAccountsListComponent', () => {
    let component;
    let fixture;
    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [SavingsAccountsListComponent]
        })
            .compileComponents();
    }));
    beforeEach(() => {
        fixture = TestBed.createComponent(SavingsAccountsListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });
    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
//# sourceMappingURL=savings-accounts-list.component.spec.js.map