import { TestBed } from '@angular/core/testing';

import { BeneficiariesService } from './beneficiaries.service';

describe('BeneficiariesService', () => {
  let service: BeneficiariesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(BeneficiariesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
