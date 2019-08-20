import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { AppService } from '../app.service';
import { Observable, Subject } from 'rxjs';
const httpOptions = {
  headers: new HttpHeaders(
    {
      'Content-Type': 'application/json',
      'Fineract-Platform-TenantId': 'mobile',
      'Access-Control-Allow-Methods': 'POST, GET, OPTIONS, DELETE, PUT',
      'Access-Control-Allow-Origin': '*'
    })
};
@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  userStatus = false;
  token = '';
  flag = new Subject<string>();
  // Instance the instance variables
  constructor(private http: HttpClient, private appService: AppService) { }
  // login method which uses authentication api by taking username and password
  login(username: string, password: string): Observable<string> {
    this.http.post<any[]>
      ('https://mobile.openmf.org/fineract-provider/api/v1/self/authentication?username=' + `${username}` + '&password=' + `${password}`,
        {}, httpOptions).subscribe((data: any) => {
          if (data.base64EncodedAuthenticationKey) {
            localStorage.setItem('isSelfService', 'false');
            if (data.roles.length === 1) {
              this.emitFlag('notSelf');
              return this.flag;
            }
            for (const item of data.roles) {
              if (item.name === 'Self Service User') {
                localStorage.setItem('isSelfService', 'true');
                this.token = data.base64EncodedAuthenticationKey;
                // Emitted token and Id as observables in app service.
                // Now the observables can be accessed anywhere via subscribers.
                // Also stored Id and token for persistency if the user visits again.
                this.appService.emitTokenObservable(this.token);
                this.appService.emitIdObservable(data.officeId);
                this.appService.emitConfig(true);
                localStorage.setItem('token', data.base64EncodedAuthenticationKey);
                localStorage.setItem('id', data.officeId);
                localStorage.setItem('userStatus', 'true');
                this.userStatus = true;
                this.emitFlag('self');
                return this.flag;
              }
            }
          } else if (localStorage.getItem('isSelfService') === 'false') {
            this.emitFlag('notSelf');
            return this.flag;
          }
        },
          err => {
            this.emitFlag('inValid');
            return this.flag;
          });

    return this.flag;
  }
  emitFlag(status: string) {
    this.flag.next(status);
  }
}
