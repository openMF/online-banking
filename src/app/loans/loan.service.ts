import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { LoanRequest } from './loanRequest.model';
import { AuthenticationService } from '../core/authentication/authentication.service';

@Injectable({
  providedIn: 'root'
})
export class LoanService {

  constructor(private http: HttpClient,
              private authenticationService: AuthenticationService) { }

  private getClientId(): number {
    const credentials = this.authenticationService.getCredentials();
    const clients = credentials?.clients;
    const clientId = clients && clients.length > 0 ? clients[0] : null;
    if (clientId === null || clientId === undefined) {
      throw new Error('No valid client ID found.');
    }
    return clientId;
  }

  getProductOptions(): Observable<any> {
    try {
      const clientId = this.getClientId();
      return this.http.get(`/self/loans/template?templateType=individual&clientId=${clientId}`);
    } catch (e) {
      return throwError(() => e);
    }
  }

  getProductOptionDetails(productId: number): Observable<any> {
    try {
      const clientId = this.getClientId();
      return this.http.get(`/self/loans/template?templateType=individual&clientId=${clientId}&productId=${productId}`);
    } catch (e) {
      return throwError(() => e);
    }
  }

  requestNewLoan(loan: LoanRequest): Observable<any> {
    try {
      loan.clientId = this.getClientId();
      loan.principal = loan.principal.toString();
      console.log(loan);
      return this.http.post('/self/loans', loan);
    } catch (e) {
      return throwError(() => e);
    }
  }

}
