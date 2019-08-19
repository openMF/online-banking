import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json',
'Fineract-Platform-TenantId': 'mobile',
Authorization: 'Basic bWlmb3M6cGFzc3dvcmQ=' })
};
@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private http: HttpClient) { }

  onCreateUser(user: any) {
    return this.http.post<any>
    ('https://mobile.openmf.org/fineract-provider/api/v1/users?username=mifos&password=password',
     httpOptions);
  }

  requestOtp() {

  }

  verifyOtp() {

  }
}
