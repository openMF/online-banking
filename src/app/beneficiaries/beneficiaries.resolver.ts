/** Angular Imports */
import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';

/** rxjs Imports */
import { Observable } from 'rxjs';

import { BeneficiariesService } from './beneficiaries.service';

/**
 * Beneficiaries Resolver
 */
@Injectable()
export class BeneficiariesResolver implements Resolve<object>{

  /**
   * @param {BeneficiariesService} beneficiariesService service for beneficiaries endpoint
   */
  constructor(private beneficiariesService: BeneficiariesService) {
  }

  /**
   * Returns the list of accounts
   * @returns {Observable<any>}
   */
  resolve(): Observable<any> {
    return this.beneficiariesService.getBeneficiariesList();
  }

}
