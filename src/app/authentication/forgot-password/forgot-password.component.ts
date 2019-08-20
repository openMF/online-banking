import { Component, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
@Component({
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  username: string;
  resetLink = false;
  // Initialise neccessary intance variables
  constructor(
    public dialogRef: MatDialogRef<ForgotPasswordComponent>) { }
  // Once the user inputs his unique identifier ex. email. An OTP would be sent via sms or email
  onResetLink() {
    this.resetLink = true;
  }
  // Close the opened dialog and return login screen
  onGoBackToLogin() {
    this.dialogRef.close();
  }
}
