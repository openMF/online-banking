import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json',
'Fineract-Platform-TenantId': 'mobile',
Authorization: 'Basic bWlmb3M6cGFzc3dvcmQ=' })
};

@Injectable({
  providedIn: 'root'
})
export class AccountsService {

  constructor(private http: HttpClient) { }

 // Returns Array of Client Accounts which comprises of Savings, Loans and Shares accounts.
  getClientAccounts(): Observable<any[]> {
    return this.http.get<any[]>
    ('https://mobile.openmf.org/fineract-provider/api/v1/clients/1/accounts/' +
    '?username=mifos&password=password',
     httpOptions);
  }
}
