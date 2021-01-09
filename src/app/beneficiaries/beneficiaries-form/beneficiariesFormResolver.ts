/** Angular Imports */
import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';

/** rxjs Imports */
import { Observable } from 'rxjs';

import { BeneficiariesService } from '../beneficiaries.service';

/**
 * Beneficiaries Form Resolver
 */
@Injectable()
export class BeneficiariesFormResolver implements Resolve<object> {

    /**
     * @param {BeneficiariesService} beneficiariesService
     */
    constructor(private beneficiariesService: BeneficiariesService) { }

    /**
     * Returns the various available Loan Product Options for the logged in user
     * @returns {Observable<any>}
     */
    resolve(): Observable<any> {
        return this.beneficiariesService.getAccountTypeOptions();
    }

}
