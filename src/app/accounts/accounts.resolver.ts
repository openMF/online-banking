/** Angular Imports */
import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';

/** rxjs Imports */
import { Observable } from 'rxjs';

import { AccountsService } from './accounts.service';

/**
 * Accounts List Resolver
 */
@Injectable()
export class AccountsResolver implements Resolve<object>{

  /**
   * @param accountsService
   */
  constructor(private accountsService: AccountsService) {
  }

  /**
   * Returns the list of accounts
   * @returns {Observable<any>}
   */
  resolve(): Observable<any> {
    return this.accountsService.getAccounts();
  }

}
