/** Angular Imports */
import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';

/** rxjs Imports */
import { Observable } from 'rxjs';

import { RecentTransactionsService } from './recent-transactions.service';

/**
 * Transactions List Resolver
 */
@Injectable()
export class RecentTransactionsResolver implements Resolve<object>{

  /**
   * @param {RecentTransactionsService} recentTransactionsService
   */
  constructor(private recentTransactionsService: RecentTransactionsService) {
  }

  /**
   * Returns the list of Recent transactions
   * @returns {Observable<any>}
   */
  resolve(): Observable<any> {
    return this.recentTransactionsService.getClientTransactions();
  }

}
