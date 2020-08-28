/** Angular Imports */
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

/** rxjs Imports */
import { of, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

/** Custom Services */
import { AlertService } from '../alert/alert.service';

/** Custom Interceptors */
import { AuthenticationInterceptor } from './authentication.interceptor';


/** Custom Models */
import { LoginContext } from './login-context';
import { Credentials } from './credentials';
import {environment} from '../../../environments/environment';

/**
 * Authentication Workflow
 */
@Injectable()
export class AuthenticationService {

  /**
   * Currently storing User credentials in Local Storage
   * TODO: Introduce option to persist or un-persist credentials
   */
  private storage: any;

  /** User Credentials */
  private credentials: Credentials;
  /** Key to store credentials in the storage */
  private credentialsStorageKey = 'selfServiceUserCredentials';

  /**
   * @param {HttpClient} http Http Client for network calls
   * @param {AlertService} alertService Alert Service
   * @param {AuthenticationInterceptor} authenticationInterceptor Interceptor for authentication requests
   */
  constructor(private http: HttpClient,
              private alertService: AlertService,
              private authenticationInterceptor: AuthenticationInterceptor) {
    this.storage = sessionStorage;
    const savedCredentials = JSON.parse(
      sessionStorage.getItem(this.credentialsStorageKey) || localStorage.getItem(this.credentialsStorageKey));

    if (savedCredentials) {
      authenticationInterceptor.setAuthorizationToken(savedCredentials.base64EncodedAuthenticationKey);
    }

  }

  /**
   * Handles User Authentication
   * @param {LoginContext} loginContext Login Parameters
   * @returns {Observable<boolean>} True if User is authenticated
   */
  login(loginContext: LoginContext) {
    this.alertService.alert({type: 'Authentication Start', message: 'Trying to login'});
    return this.http.post('/self/authentication', {username: loginContext.username, password: loginContext.password})
      .pipe(
        map((credentials: Credentials) => {
          this.onLoginSuccess(credentials);
          return of(true);
        })
      );
  }

  /**
   * Sets the Authorization Token.
   * @param {Credentials} credentials Authenticated user's credentials
   */
  onLoginSuccess(credentials: Credentials){
    this.authenticationInterceptor.setAuthorizationToken(credentials.base64EncodedAuthenticationKey);
    this.setCredentials(credentials);
    this.alertService.alert({ type: 'Authentication Success', message: `${credentials.username} successfully logged in!` });
    delete this.credentials;
  }

  /**
   * Logs out the user and clear the credentials from storage,
   * @returns {Observable<boolean>} True if user was logged out
   */
  logout(): Observable<boolean> {
    this.authenticationInterceptor.removeAuthorization();
    this.setCredentials();
    return of(true);
  }

  /**
   * @returns {boolean} True if the user has self service role
   */
  isSelfServiceUser(): boolean {
    const userCredentials: Credentials = JSON.parse(this.storage.getItem(this.credentialsStorageKey));
    if (!(userCredentials)) {
      return false;
    }
    return userCredentials.roles.filter( (role) => role.id === environment.selfServiceRoleId).length > 0;
  }

  /**
   * Checks if user is authenticated
   * @returns {boolean} True if the user is authenticated
   */
  isAuthenticated(): boolean {
    return !!(JSON.parse(this.storage.getItem(this.credentialsStorageKey))) && this.isSelfServiceUser();
  }

  /**
   * Returns the user's credentials
   * @returns {Credentials} the credentials in case of authenticated user else null
   */
  getCredentials(): Credentials | null {
    return JSON.parse(this.storage.getItem(this.credentialsStorageKey));
  }

  /**
   * Sends a password reset mail
   * @param {string} email Email id of user
   */
  resetPassword(email: string) {
    // TODO: Implementation
    return true;
  }

  /**
   * Sets the user credentials
   * @param {Credentials} credentials Authenticated user's credentials
   */
  private setCredentials(credentials?: Credentials) {
    if (credentials) {
      this.storage.setItem(this.credentialsStorageKey, JSON.stringify(credentials));
    } else {
      this.storage.removeItem(this.credentialsStorageKey);
    }
  }

}
