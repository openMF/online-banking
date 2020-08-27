/** Angular Imports */
import { Injectable } from '@angular/core';
import { Resolve } from '@angular/router';

/** rxjs Imports */
import { Observable } from 'rxjs';

import { TptService } from './tpt.service';

/**
 * Third Party Transfer Resolver
 */
@Injectable()
export class TptResolver implements Resolve<object> {

    /**
     * @param tptService
     */
    constructor(private tptService: TptService) { }

    /**
     * Returns the template for making a TPT Request i.e. from and to Account options
     * @returns {Observable<any>}
     */
    resolve(): Observable<any> {
        return this.tptService.getTPTTemplate();
    }

}
