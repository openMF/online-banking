import { async, TestBed } from '@angular/core/testing';
import { RecentTransactionsComponent } from './recent-transactions.component';
describe('RecentTransactionsComponent', () => {
    let component;
    let fixture;
    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [RecentTransactionsComponent]
        })
            .compileComponents();
    }));
    beforeEach(() => {
        fixture = TestBed.createComponent(RecentTransactionsComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });
    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
//# sourceMappingURL=recent-transactions.component.spec.js.map