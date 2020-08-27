import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators } from '@angular/forms';

/** rxjs Imports */
import { finalize } from 'rxjs/operators';

/** Custom Services */
import { AuthenticationService } from '../../core/authentication/authentication.service';
import {AlertService} from '../../core/alert/alert.service';

@Component({
  selector: 'online-banking-login-form',
  templateUrl: './login-form.component.html',
  styleUrls: ['./login-form.component.css']
})
export class LoginFormComponent implements OnInit {

  /** Login Form Group */
  loginForm: FormGroup;
  passwordInputType: string;
  loading = false;

  /**
   * @param {FormBuilder} formBuilder Form Builder
   * @param {AuthenticationService} authenticationService Authentication Service
   */
  constructor(private formBuilder: FormBuilder,
              private authenticationService: AuthenticationService,
              private alertService: AlertService) { }

  /**
   * Create Login Form
   * Initialize password input field type
   */
  ngOnInit(): void {
    this.createLoginForm();
    this.passwordInputType = 'password';
  }

  /**
   * Authenticate user credentials
   */
  login(){
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
  private createLoginForm(){
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

}
