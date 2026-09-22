import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { RegistrationService } from '../core/authentication/registration.service';
import { AlertService } from '../core/alert/alert.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'online-banking-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.css']
})
export class RegisterComponent implements OnInit {

  registerForm: FormGroup;
  verifyForm: FormGroup;
  loading = false;
  isVerificationStep = false;
  requestId: string;

  registrationError: string | null = null;
  verificationError: string | null = null;

  constructor(
    private formBuilder: FormBuilder,
    private registrationService: RegistrationService,
    private alertService: AlertService,
    private router: Router
  ) { }

  ngOnInit(): void {
    this.registerForm = this.formBuilder.group({
      username: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(4)]],
      firstName: ['', Validators.required],
      middleName: [''],
      lastName: ['', Validators.required],
      accountNumber: ['', Validators.required],
      mobileNumber: [''],
      email: ['', [Validators.required, Validators.email]],
      authenticationMode: ['email', Validators.required]
    });

    this.verifyForm = this.formBuilder.group({
      authenticationToken: ['', Validators.required]
    });
  }

  submitRegistration() {
    if (this.registerForm.invalid) return;

    this.loading = true;
    this.registerForm.disable();
    this.registrationError = null;

    this.registrationService.register(this.registerForm.value)
      .pipe(finalize(() => {
        this.loading = false;
        this.registerForm.enable();
      }))
      .subscribe((res: any) => {
        // Assume response contains a requestId to be used in verification
        this.requestId = res.requestId || res.resourceId || 'unknown_id';
        this.isVerificationStep = true;
        this.alertService.alert({ type: 'Registration Success', message: 'Verification token sent! Please check your email/SMS.' });
      }, (error) => {
        // Extract Fineract-specific backend errors
        if (error.error?.errors && error.error.errors.length > 0) {
          let msg = error.error.errors[0].defaultUserMessage || error.error.errors[0].developerMessage;
          if (msg && msg.startsWith('Password must be')) {
            msg = 'Password must be 12+ chars with uppercase, lowercase, number, and special character.';
          }
          this.registrationError = msg;
        } else {
          this.registrationError = error.error?.developerMessage || error.error?.defaultUserMessage || 'An unexpected error occurred. Please try again.';
        }
      });
  }

  submitVerification() {
    if (this.verifyForm.invalid) return;

    this.loading = true;
    this.verifyForm.disable();
    this.verificationError = null;

    const payload = {
      requestId: this.requestId,
      authenticationToken: this.verifyForm.value.authenticationToken
    };

    this.registrationService.verify(payload)
      .pipe(finalize(() => {
        this.loading = false;
        this.verifyForm.enable();
      }))
      .subscribe((res: any) => {
        this.alertService.alert({ type: 'Verification Success', message: 'Account activated! You can now log in.' });
        this.router.navigate(['/login'], { replaceUrl: true });
      }, (error) => {
        // Extract Fineract-specific backend errors
        if (error.error?.errors && error.error.errors.length > 0) {
          this.verificationError = error.error.errors[0].defaultUserMessage || error.error.errors[0].developerMessage;
        } else {
          this.verificationError = error.error?.developerMessage || error.error?.defaultUserMessage || 'Invalid token.';
        }
      });
  }
}
