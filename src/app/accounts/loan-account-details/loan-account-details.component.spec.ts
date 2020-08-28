import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanAccountDetailsComponent } from './loan-account-details.component';

describe('LoanAccountDetailsComponent', () => {
  let component: LoanAccountDetailsComponent;
  let fixture: ComponentFixture<LoanAccountDetailsComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LoanAccountDetailsComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LoanAccountDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
