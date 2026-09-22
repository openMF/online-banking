import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AuthenticationService } from '../../core/authentication/authentication.service';
import { AlertService } from '../../core/alert/alert.service';
import { finalize } from 'rxjs/operators';

@Component({
  selector: 'online-banking-reset-password',
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.css']
})
export class ResetPasswordComponent implements OnInit {

  requestForm: FormGroup;
  renewForm: FormGroup;
  loading = false;
  isRenewStep = false;

  constructor(
    private formBuilder: FormBuilder,
    private authenticationService: AuthenticationService,
    private alertService: AlertService
  ) { }

  ngOnInit(): void {
    this.requestForm = this.formBuilder.group({
      username: ['', Validators.required]
    });

    this.renewForm = this.formBuilder.group({
      authenticationToken: ['', Validators.required],
      password: ['', [Validators.required, Validators.minLength(4)]],
      repeatPassword: ['', Validators.required]
    });
  }

  requestError: string | null = null;
  renewError: string | null = null;

  submitRequest() {
    if (this.requestForm.invalid) return;

    this.loading = true;
    this.requestForm.disable();
    this.requestError = null;

    this.authenticationService.requestPasswordReset(this.requestForm.value.username)
      .pipe(finalize(() => {
        this.loading = false;
        this.requestForm.enable();
      }))
      .subscribe((res: any) => {
        this.isRenewStep = true;
      }, (error) => {
        this.requestError = error.error?.developerMessage || error.error?.defaultUserMessage || 'Unable to request reset.';
      });
  }

  submitRenew() {
    if (this.renewForm.invalid) return;

    this.loading = true;
    this.renewForm.disable();
    this.renewError = null;

    const payload = this.renewForm.value;

    this.authenticationService.renewPassword(payload)
      .pipe(finalize(() => {
        this.loading = false;
        this.renewForm.enable();
      }))
      .subscribe((res: any) => {
        this.alertService.alert({ type: 'Renew Success', message: 'Password renewed! You can now log in.' });
        this.cancel();
      }, (error) => {
        let msg = '';
        if (error.error?.errors && error.error.errors.length > 0) {
          msg = error.error.errors[0].defaultUserMessage || error.error.errors[0].developerMessage;
        } else {
          msg = error.error?.developerMessage || error.error?.defaultUserMessage || 'Invalid token or password.';
        }
        
        if (msg && msg.startsWith('Password must be')) {
          msg = 'Password must be 12+ chars with uppercase, lowercase, number, and special character.';
        }
        
        this.renewError = msg;
      });
  }

  cancel() {
    this.alertService.alert({ type: 'Cancel Password Reset', message: '' });
  }
}
