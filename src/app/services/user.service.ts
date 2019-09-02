import { Injectable } from '@angular/core';
import { HttpHeaders, HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../models/user';
const httpOptions = {
  headers: new HttpHeaders({
    'Content-Type': 'application/json',
    'Fineract-Platform-TenantId': 'mobile',
    Authorization: 'Basic ' + localStorage.getItem('token')
  })
};
@Injectable({
  providedIn: 'root'
})
export class UserService {

  constructor(private http: HttpClient) { }

  // Uses backend api which creates user
  onCreateUser(user: User) {
    return this.http.post<any>
      ('https://mobile.openmf.org/fineract-provider/api/v1/users',
        {
          username: user.username,
          firstname: user.firstname,
          lastname: user.lastname,
          email: user.email,
          officeId: 1,
          staffId: 1,
          roles: [2],
          sendPasswordToEmail: true,
          isSelfServiceUser: true,
        },
        httpOptions);
  }
  // Uses Backend api which updates password
  updatePassword(data: any): Observable<any> {
    console.log(JSON.stringify(data));
    return this.http.put<any>
      ('https://mobile.openmf.org/fineract-provider/api/v1/users/' + data.id,
        {
          password: data.password,
          repeatPassword: data.confirmPassword
        },
        httpOptions
      );
  }
}
