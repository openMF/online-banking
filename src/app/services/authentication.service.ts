import { Injectable } from '@angular/core';
import {HttpClient, HttpHeaders} from '@angular/common/http';
import { Observable } from 'rxjs';
import { AppService } from '../app.service';
const httpOptions = {
  headers: new HttpHeaders(
  { 'Content-Type': 'application/json',
    'Fineract-Platform-TenantId': 'mobile'})
};
@Injectable({
  providedIn: 'root'
})
export class AuthenticationService {
  userStatus = false;
  key = 'token';
  constructor(private http: HttpClient, private appService: AppService) { }
   login(username: string, password: string) {
     if (username === 'mifos' && password === 'password') {
      localStorage.setItem(this.key, 'bWlmb3M6cGFzc3dvcmQ=');
      this.userStatus = true;
      this.appService.emitConfig(this.userStatus);
      this.http.post<any>(
        'https://mobile.openmf.org/fineract-provider/api/v1/authentication?username=mifos&password=password',
        httpOptions).subscribe((data: any) => console.log(data));
      return true;
     } else {
       return false;
     }

    // return this.http.post<any>(
    //   'https://mobile.openmf.org/fineract-provider/api/v1/authentication?username=' + `${username}` + '&password=' + `${password}`,
    //   httpOptions).subscribe((data: any) => console.log(data));
    // }

}
}
