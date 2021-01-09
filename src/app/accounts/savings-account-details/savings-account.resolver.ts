/** Angular Imports */
import { Injectable } from '@angular/core';
import { ActivatedRoute, Resolve, Router } from '@angular/router';

/** rxjs Imports */
import { Observable } from 'rxjs';

import { AccountsService } from '../accounts.service';

/**
 * Accounts List Resolver
 */
@Injectable()
export class SavingsAccountResolver implements Resolve<object>{

  /**
   * @param accountsService
   */
  constructor(private accountsService: AccountsService,
              private router: Router) {
  }

  /**
   * Returns the list of accounts
   * @returns {Observable<any>}
   */
  resolve(): Observable<any> {
    const accountId = this.router.getCurrentNavigation().extras.queryParams?.id;
    console.log(accountId);
    return this.accountsService.getSavingsAccountDetails(accountId);
  }

}
