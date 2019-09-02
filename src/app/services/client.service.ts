import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppService } from '../app.service';

@Injectable({
  providedIn: 'root'
})
export class ClientService {
  httpOptions = {};
  token: string;
  // Set the headers dynamically by setting the token.
  constructor(private http: HttpClient,
              private appService: AppService
  ) {
    this.appService.tokenObservable.subscribe((token: string) => {
      if (token) {
        this.setHeaders(token);
      }
    });
    if (localStorage.getItem('token')) {
      this.setHeaders(localStorage.getItem('token'));
    }
  }
  setHeaders(token: string) {
    this.httpOptions = {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Fineract-Platform-TenantId': 'mobile',
        Authorization: 'Basic ' + token
      })
    };
  }
  // Returns Array of Client Accounts which comprises of Savings, Loans and Shares accounts.
  getClientAccounts(id: string): Observable<any[]> {
    return this.http.get<any[]>
      ('https://mobile.openmf.org/fineract-provider/api/v1/self/clients/' + `${id}` + '/accounts',
        this.httpOptions);
  }
  getClient(id: string): Observable<any[]> {
    return this.http.get<any[]>
      ('https://mobile.openmf.org/fineract-provider/api/v1/self/clients/' + `${id}`,
        this.httpOptions);
  }
  getClientImage(id: string): Observable<any> {
    return this.http.get
      ('https://mobile.openmf.org/fineract-provider/api/v1/self/clients/' + `${id}` + '/images',
        {
          headers: new HttpHeaders({
            'Fineract-Platform-TenantId': 'mobile',
            Authorization: 'Basic ' + localStorage.getItem('token')
          })
        });
  }
}
