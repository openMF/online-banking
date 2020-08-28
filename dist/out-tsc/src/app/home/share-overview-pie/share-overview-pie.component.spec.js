import { async, TestBed } from '@angular/core/testing';
import { ShareOverviewPieComponent } from './share-overview-pie.component';
describe('ShareOverviewPieComponent', () => {
    let component;
    let fixture;
    beforeEach(async(() => {
        TestBed.configureTestingModule({
            declarations: [ShareOverviewPieComponent]
        })
            .compileComponents();
    }));
    beforeEach(() => {
        fixture = TestBed.createComponent(ShareOverviewPieComponent);
        component = fixture.componentInstance;
        fixture.detectChanges();
    });
    it('should create', () => {
        expect(component).toBeTruthy();
    });
});
//# sourceMappingURL=share-overview-pie.component.spec.js.map