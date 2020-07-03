import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { SavingsOverviewPieComponent } from './savings-overview-pie.component';

describe('SavingsOverviewPieComponent', () => {
  let component: SavingsOverviewPieComponent;
  let fixture: ComponentFixture<SavingsOverviewPieComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ SavingsOverviewPieComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(SavingsOverviewPieComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
