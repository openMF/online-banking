import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanOverviewPieComponent } from './loan-overview-pie.component';

describe('LoanOverviewPieComponent', () => {
  let component: LoanOverviewPieComponent;
  let fixture: ComponentFixture<LoanOverviewPieComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LoanOverviewPieComponent ]
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
