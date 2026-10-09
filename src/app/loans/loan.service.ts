import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { LoanRequest } from './loanRequest.model';
import { AuthenticationService } from '../core/authentication/authentication.service';

@Injectable({
  providedIn: 'root'
})
export class LoanService {

  constructor(private http: HttpClient,
              private authenticationService: AuthenticationService) { }

  getProductOptions() {
   const clients = this.authenticationService.getCredentials().clients;
   const clientId = clients && clients.length > 0 ? clients[0] : null;
   return this.http.get(`/self/loans/template?templateType=individual&clientId=${clientId}`);
  }

  getProductOptionDetails(productId: number){
    const clients = this.authenticationService.getCredentials().clients;
    const clientId = clients && clients.length > 0 ? clients[0] : null;
    return this.http.get(`/self/loans/template?templateType=individual&clientId=${clientId}&productId=${productId}`);
  }

  requestNewLoan(loan: LoanRequest){
    const clients = this.authenticationService.getCredentials().clients;
    const clientId = clients && clients.length > 0 ? clients[0] : null;
    loan.clientId = clientId;
    loan.principal = loan.principal.toString();
    console.log(loan);
    return this.http.post('/self/loans', loan);
  }

}
