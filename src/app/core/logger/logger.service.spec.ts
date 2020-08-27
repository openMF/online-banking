import { TestBed } from '@angular/core/testing';

import { Logger } from './logger.service';

describe('LoggerService', () => {
  let service: Logger;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(Logger);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
