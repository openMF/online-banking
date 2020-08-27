import { TestBed } from '@angular/core/testing';

import { RecentTransactionsService } from './recent-transactions.service';

describe('RecentTransactionsService', () => {
  let service: RecentTransactionsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RecentTransactionsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
