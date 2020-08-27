/** Angular Imports */
import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';

/** rxjs Imports */
import { Observable } from 'rxjs';

import { ChargesService } from './charges.service';

/**
 * Charges Resolver
 */
@Injectable()
export class ChargesResolver implements Resolve<object>{

  /**
   * @param {ChargesService} chargesService service for charges endpoint
   */
  constructor(private chargesService: ChargesService) {
  }

  /**
   * Returns the charges list from 0 to 200
   * @returns {Observable<any>}
   */
  resolve(): Observable<any> {
    return this.chargesService.getClientCharges();
  }

}
