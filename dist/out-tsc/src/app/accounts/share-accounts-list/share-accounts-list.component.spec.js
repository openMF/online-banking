import { async, TestBed } from '@angular/core/testing';
import { ShareAccountsListComponent } from './share-accounts-list.component';
describe('ShareAccountsListComponent', () => {
    let component;
    let fixture;
    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ShareAccountsListComponent]
        })
            .compileComponents();
    }));
    beforeEach(() => {
        fixture = TestBed.createComponent(ShareAccountsListComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });
    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
//# sourceMappingURL=share-accounts-list.component.spec.js.map