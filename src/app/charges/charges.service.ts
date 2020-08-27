import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { AuthenticationService } from '../core/authentication/authentication.service';

@Injectable({
  providedIn: 'root'
})
export class ChargesService {

  constructor(private http: HttpClient,
              private authenticationService: AuthenticationService) { }


  getClientCharges() {
    const userId = this.authenticationService.getCredentials().userId;
    return this.http.get(`/self/clients/${userId}/charges`);
  }

}
