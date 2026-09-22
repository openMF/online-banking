import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class RegistrationService {

  constructor(private http: HttpClient) { }

  /**
   * Initiates the self-service registration process.
   * @param payload The registration details (e.g. account number, email, etc.)
   */
  register(payload: any): Observable<any> {
    return this.http.post('/self/registration', payload);
  }

  /**
   * Verifies and activates the user account using the token.
   * @param payload The verification details (e.g. requestId, token)
   */
  verify(payload: any): Observable<any> {
    return this.http.post('/self/registration/user', payload);
  }
}
