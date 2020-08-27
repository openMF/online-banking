import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { LoanAccountsListComponent } from './loan-accounts-list.component';

describe('LoanAccountsListComponent', () => {
  let component: LoanAccountsListComponent;
  let fixture: ComponentFixture<LoanAccountsListComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ LoanAccountsListComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(LoanAccountsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
