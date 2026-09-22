import { Component, OnInit } from '@angular/core';
import { FormGroup, FormBuilder, Validators, FormGroupDirective } from '@angular/forms';

/** rxjs Imports */
import { finalize } from 'rxjs/operators';

/** Custom Services */
import { AuthenticationService } from '../../core/authentication/authentication.service';
import { AlertService } from '../../core/alert/alert.service';

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

  loginError: string | null = null;

  /**
   * Authenticate user credentials
   */
  login(formDirective: FormGroupDirective) {
    this.loading = true;
    this.loginForm.disable();
    this.loginError = null;
    this.loginForm.enable();
    
    this.authenticationService.login(this.loginForm.value)
      .pipe(finalize(() => {
        if (!this.loginError) {
          formDirective.resetForm();
          this.loginForm.markAsPristine();
        }
        this.loginForm.enable();
        this.loading = false;
      })).subscribe({
        next: () => {
          // handled in auth service
        },
        error: (error) => {
          let msg = '';
          if (error.error?.errors && error.error.errors.length > 0) {
            msg = error.error.errors[0].defaultUserMessage || error.error.errors[0].developerMessage;
          } else {
            msg = error.error?.defaultUserMessage || error.error?.developerMessage || error.message || 'Invalid username or password.';
          }
          
          if (msg === 'Unauthenticated. Please login.' || msg === 'Unauthenticated. Please login') {
            msg = 'Wrong username or password';
          }
          
          this.loginError = msg;
        }
      });
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
  private createLoginForm() {
    this.loginForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', Validators.required]
    });
  }

}
