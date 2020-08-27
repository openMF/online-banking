/** Angular Imports */
import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';

/** rxjs Imports */
import { Observable } from 'rxjs';

import { TransfersService } from './transfers.service';

/**
 * Beneficiaries Resolver
 */
@Injectable()
export class TransfersResolver implements Resolve<object>{

  /**
   * @param {TransfersService} transferService service for beneficiaries endpoint
   */
  constructor(private transferService: TransfersService) {
  }

  /**
   * Returns the list of accounts
   * @returns {Observable<any>}
   */
  resolve(): Observable<any> {
    return this.transferService.getTransferTemplate();
  }

}
