import { TestBed } from '@angular/core/testing';

import { TransfersService } from './transfers.service';

describe('TransfersService', () => {
  let service: TransfersService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TransfersService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
