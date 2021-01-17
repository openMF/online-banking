import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { BeneficiariesFormComponent } from './beneficiaries-form.component';

describe('BeneficiariesFormComponent', () => {
  let component: BeneficiariesFormComponent;
  let fixture: ComponentFixture<BeneficiariesFormComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ BeneficiariesFormComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(BeneficiariesFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
