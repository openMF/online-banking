/** Angular Imports */
import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';

/** rxjs Imports */
import { Observable } from 'rxjs';

import { AccountsService } from './accounts.service';
import { ClientAccounts } from './accounts.model';

/**
 * Accounts List Resolver
 */
@Injectable()
export class AccountsResolver implements Resolve<ClientAccounts> {

  /**
   * @param accountsService
   */
  constructor(private accountsService: AccountsService) {
  }

  /**
   * Returns the list of accounts
   * @returns {Observable<ClientAccounts>}
   */
  resolve(): Observable<ClientAccounts> {
    return this.accountsService.getAccounts();
  }

}
