import { __decorate } from "tslib";
/** Angular Imports */
import { Injectable } from '@angular/core';
/** rxjs Imports */
import { of } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../environments/environment';
/**
 * Authentication Workflow
 */
let AuthenticationService = class AuthenticationService {
    /**
     * @param {HttpClient} http Http Client for network calls
     * @param {AlertService} alertService Alert Service
     * @param {AuthenticationInterceptor} authenticationInterceptor Interceptor for authentication requests
     */
    constructor(http, alertService, authenticationInterceptor) {
        this.http = http;
        this.alertService = alertService;
        this.authenticationInterceptor = authenticationInterceptor;
        /** Key to store credentials in the storage */
        this.credentialsStorageKey = 'selfServiceUserCredentials';
        this.storage = sessionStorage;
        const savedCredentials = JSON.parse(sessionStorage.getItem(this.credentialsStorageKey) || localStorage.getItem(this.credentialsStorageKey));
        if (savedCredentials) {
            authenticationInterceptor.setAuthorizationToken(savedCredentials.base64EncodedAuthenticationKey);
        }
    }
    /**
     * Handles User Authentication
     * @param {LoginContext} loginContext Login Parameters
     * @returns {Observable<boolean>} True if User is authenticated
     */
    login(loginContext) {
        this.alertService.alert({ type: 'Authentication Start', message: 'Trying to login' });
        return this.http.post('/self/authentication', { username: loginContext.username, password: loginContext.password })
            .pipe(map((credentials) => {
            this.onLoginSuccess(credentials);
            return of(true);
        }));
    }
    /**
     * Sets the Authorization Token.
     * @param {Credentials} credentials Authenticated user's credentials
     */
    onLoginSuccess(credentials) {
        this.authenticationInterceptor.setAuthorizationToken(credentials.base64EncodedAuthenticationKey);
        this.setCredentials(credentials);
        this.alertService.alert({ type: 'Authentication Success', message: `${credentials.username} successfully logged in!` });
        delete this.credentials;
    }
    /**
     * Logs out the user and clear the credentials from storage,
     * @returns {Observable<boolean>} True if user was logged out
     */
    logout() {
        this.authenticationInterceptor.removeAuthorization();
        this.setCredentials();
        return of(true);
    }
    /**
     * @returns {boolean} True if the user has self service role
     */
    isSelfServiceUser() {
        const userCredentials = JSON.parse(this.storage.getItem(this.credentialsStorageKey));
        if (!(userCredentials)) {
            return false;
        }
        return userCredentials.roles.filter((role) => role.id === environment.selfServiceRoleId).length > 0;
    }
    /**
     * Checks if user is authenticated
     * @returns {boolean} True if the user is authenticated
     */
    isAuthenticated() {
        return !!(JSON.parse(this.storage.getItem(this.credentialsStorageKey))) && this.isSelfServiceUser();
    }
    /**
     * Returns the user's credentials
     * @returns {Credentials} the credentials in case of authenticated user else null
     */
    getCredentials() {
        return JSON.parse(this.storage.getItem(this.credentialsStorageKey));
    }
    /**
     * Sends a password reset mail
     * @param {string} email Email id of user
     */
    resetPassword(email) {
        // TODO: Implementation
        return true;
    }
    /**
     * Sets the user credentials
     * @param {Credentials} credentials Authenticated user's credentials
     */
    setCredentials(credentials) {
        if (credentials) {
            this.storage.setItem(this.credentialsStorageKey, JSON.stringify(credentials));
        }
        else {
            this.storage.removeItem(this.credentialsStorageKey);
        }
    }
};
AuthenticationService = __decorate([
    Injectable()
], AuthenticationService);
export { AuthenticationService };
//# sourceMappingURL=authentication.service.js.map