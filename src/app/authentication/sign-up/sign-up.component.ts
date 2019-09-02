import { Component, OnInit, Inject, DoCheck } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog, MatSnackBar } from '@angular/material';
import { VerificationComponent } from '../verification/verification.component';
import { UserService } from 'src/app/services/user.service';
import { NgForm, FormControl, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { User } from 'src/app/models/user';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss']
})
export class SignUpComponent implements OnInit, DoCheck {
  disabled = true;
  user = new User();
  Username = new FormControl('', [
    Validators.required, ]);
  Password = new FormControl('', [
    Validators.required,
  ]);
  Firstname = new FormControl('', [
    Validators.required,
  ]);
  Lastname = new FormControl('', [
    Validators.required,
  ]);
  Email = new FormControl('', [
    Validators.required,
    Validators.email,
  ]);
  ConfirmPassword = new FormControl('', [
    Validators.required,
  ]);
  Mobile = new FormControl('', [
    Validators.required,
    Validators.min(100000000000),
    Validators.max(999999999999)
  ]);
  showText: boolean;
  token: any;
  // Initialise all instance variables
  constructor(
    public dialogRef: MatDialogRef<SignUpComponent>,
    public dialog: MatDialog,
    private userService: UserService,
    private router: Router,
    private snackBar: MatSnackBar) {
    this.user.confirmPassword = '';
  }
  // Close the dialog
  onNoClick(): void {
    this.dialogRef.close();
  }
  // Check repeateadly if input fields are valid, then enable and disable the sign up button resp.
  ngDoCheck() {
    if (!this.Username.hasError('required') && !this.Firstname.hasError('required') && !this.Lastname.hasError('required')
      && !this.Email.hasError('required') && !this.Email.hasError('email') && !this.Password.hasError('required')
      && !this.ConfirmPassword.hasError('required') && !this.Mobile.hasError('required') && this.showText === false
      && this.user.agreement === true) {
      this.disabled = false;
    } else {
      this.disabled = true;
    }
    if (this.user.confirmPassword.length > 0 && this.user.confirmPassword !== this.user.password) {
      this.showText = true;
    } else {
      this.showText = false;
    }
  }
  // Creates a user
  onSignUp(ngform: NgForm) {
    this.onNoClick();
    if (this.user.password === this.user.confirmPassword) {
      this.onCreateUser(this.user);
    }
  }
  // Opens a snackbar
  openSnackBar(message, action) {
    this.snackBar.open(message, action, {
      duration: 1000,
    });
  }
  onCreateUser(user: User) {
    this.userService.onCreateUser(user).subscribe((data: any) => {
      this.openSnackBar('Registration Success!', 'Ok');
      this.userService.updatePassword({
        id: data.resourceId,
        password: this.user.password,
        confirmPassword: this.user.confirmPassword,
        token: this.token
      }).subscribe(() => {
        this.openSnackBar('Registered Successfully!', 'Ok');
      });
    },
      err => {
        this.openSnackBar('Registration failed!', 'Ok');
      });
  }

  ngOnInit() {
  }
  // Open dialog for verification
  openDialog(): void {
    this.dialog.open(VerificationComponent, {
      width: '500px',
    });
  }

}
