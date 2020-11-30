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
   const userId = this.authenticationService.getCredentials().userId;
   return this.http.get(`/self/loans/template?templateType=individual&clientId=${userId}`);
  }

  getProductOptionDetails(productId: number){
    const userId = this.authenticationService.getCredentials().userId;
    return this.http.get(`/self/loans/template?templateType=individual&clientId=${userId}&productId=${productId}`);
  }

  requestNewLoan(loan: LoanRequest){
    loan.clientId = this.authenticationService.getCredentials().userId;
    loan.principal = loan.principal.toString();
    console.log(loan);
    return this.http.post('/self/loans', loan);
  }

}
