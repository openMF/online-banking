import { __decorate } from "tslib";
import { Component } from '@angular/core';
import { Validators } from '@angular/forms';
/** rxjs Imports */
import { finalize } from 'rxjs/operators';
let LoginFormComponent = class LoginFormComponent {
    /**
     * @param {FormBuilder} formBuilder Form Builder
     * @param {AuthenticationService} authenticationService Authentication Service
     */
    constructor(formBuilder, authenticationService, alertService) {
        this.formBuilder = formBuilder;
        this.authenticationService = authenticationService;
        this.alertService = alertService;
        this.loading = false;
    }
    /**
     * Create Login Form
     * Initialize password input field type
     */
    ngOnInit() {
        this.createLoginForm();
        this.passwordInputType = 'password';
    }
    /**
     * Authenticate user credentials
     */
    login() {
        this.loading = true;
        this.loginForm.disable();
        console.log('Trying to login with', this.loginForm.value);
        this.loginForm.enable();
        this.authenticationService.login(this.loginForm.value)
            .pipe(finalize(() => {
            this.loginForm.reset();
            this.loginForm.markAsPristine();
            // Angular Material Bug: Validation errors won't get removed on reset.
            this.loginForm.enable();
            this.loading = false;
        })).subscribe();
    }
    /**
     * Display the forgot password component
     */
    forgotPassword() {
        console.log('Forgot Password Clicked');
        this.alertService.alert({ type: 'Password Reset Required', message: `Password Reset Required` });
    }
    /**
     * Create Login Form
     */
    createLoginForm() {
        this.loginForm = this.formBuilder.group({
            username: ['', Validators.required],
            password: ['', Validators.required]
        });
    }
};
LoginFormComponent = __decorate([
    Component({
        selector: 'online-banking-login-form',
        templateUrl: './login-form.component.html',
        styleUrls: ['./login-form.component.css']
    })
], LoginFormComponent);
export { LoginFormComponent };
//# sourceMappingURL=login-form.component.js.map