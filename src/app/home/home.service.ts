import { Injectable } from '@angular/core';
import {HttpClient} from '@angular/common/http';
import {Observable} from 'rxjs';
import {AuthenticationService} from '../core/authentication/authentication.service';

@Injectable({
  providedIn: 'root'
})
export class HomeService {
  /**
   * @param {HttpClient} http Client for sending requests
   */
  constructor(private http: HttpClient,
              private authenticationService: AuthenticationService) { }

  getAccounts(): Observable<any> {
    const userId = this.authenticationService.getCredentials().userId;
    return this.http.get(`/clients/${userId}/accounts`);
  }

}
