import { TestBed } from '@angular/core/testing';

import { ChargesService } from './charges.service';

describe('ChargesService', () => {
  let service: ChargesService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(ChargesService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
