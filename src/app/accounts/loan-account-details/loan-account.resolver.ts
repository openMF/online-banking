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
export class LoanAccountResolver implements Resolve<object>{

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
    const loanId = this.router.getCurrentNavigation().extras.queryParams?.id;
    console.log(loanId);
    return this.accountsService.getLoanAccountDetails(loanId);
  }

}
