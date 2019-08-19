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
export class SharesService {

  constructor(private http: HttpClient) { }

  getShareAccounts(): Observable<any[]> {
    return this.http.get<any[]>
    ('https://mobile.openmf.org/fineract-provider/api/v1/accounts/share?username=mifos&password=password', httpOptions);
  }
}
