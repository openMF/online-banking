/** Angular Imports */
import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';

/** rxjs Imports */
import { Observable } from 'rxjs';

import { LoanService } from './loan.service';

/**
 * Apply Loan Resolver
 */
@Injectable()
export class ApplyLoanResolver implements Resolve<object> {

    /**
     * @param {LoanService} loanService
     */
    constructor(private loanService: LoanService) { }

    /**
     * Returns the various available Loan Product Options for the logged in user
     * @returns {Observable<any>}
     */
    resolve(): Observable<any> {
        return this.loanService.getProductOptions();
    }

}
