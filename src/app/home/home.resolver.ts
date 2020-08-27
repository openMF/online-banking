/** Angular Imports */
import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';

/** rxjs Imports */
import { Observable } from 'rxjs';

import { HomeService } from './home.service';

/**
 * Accounts List Resolver
 */
@Injectable()
export class HomeResolver implements Resolve<object>{

  /**
   * @param homeService
   */
  constructor(private homeService: HomeService) {
  }

  /**
   * Returns the list of accounts
   * @returns {Observable<any>}
   */
  resolve(): Observable<any> {
    return this.homeService.getAccounts();
  }

}
