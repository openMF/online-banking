import { TestBed } from '@angular/core/testing';

import { TptService } from './tpt.service';

describe('TptService', () => {
  let service: TptService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TptService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
