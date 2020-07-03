import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { ShareOverviewPieComponent } from './share-overview-pie.component';

describe('ShareOverviewPieComponent', () => {
  let component: ShareOverviewPieComponent;
  let fixture: ComponentFixture<ShareOverviewPieComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ ShareOverviewPieComponent ]
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
