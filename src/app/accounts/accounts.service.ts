import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { AuthenticationService } from '../core/authentication/authentication.service';
import { ClientAccounts, SavingsAccountDetails, LoanAccountDetails, ShareAccountDetails } from './accounts.model';

@Injectable({
  providedIn: 'root'
})
export class AccountsService {
  /**
   * @param {HttpClient} http Client for sending requests
   * @param {AuthenticationService} authenticationService Service for obtaining authentication details
   */
  constructor(private http: HttpClient,
              private authenticationService: AuthenticationService) { }

  /**
   * Retrieves all accounts (loan, savings, share) for the logged-in self-service client.
   * @returns An Observable of ClientAccounts
   */
  getAccounts(): Observable<ClientAccounts> {
    const clients = this.authenticationService.getCredentials()?.clients;
    const clientId = clients && clients.length > 0 ? clients[0] : null;
    
    if (!clientId) {
      return throwError(new Error('No valid client ID found.'));
    }

    return this.http.get<ClientAccounts>(`/self/clients/${clientId}/accounts`);
  }

  /**
   * Retrieves specific savings account details, including transactions if associations=transactions.
   */
  getSavingsAccount(accountId: string | number): Observable<SavingsAccountDetails> {
    return this.http.get<SavingsAccountDetails>(`/self/savingsaccounts/${accountId}?associations=transactions`);
  }

  /**
   * Retrieves specific loan account details, including transactions if associations=transactions.
   */
  getLoanAccount(loanId: string | number): Observable<LoanAccountDetails> {
    return this.http.get<LoanAccountDetails>(`/self/loans/${loanId}?associations=transactions`);
  }

  /**
   * Retrieves specific share account details.
   */
  getShareAccount(accountId: string | number): Observable<ShareAccountDetails> {
    return this.http.get<ShareAccountDetails>(`/self/shareaccounts/${accountId}`);
  }

}
