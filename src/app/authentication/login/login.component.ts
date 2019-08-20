import { Component, OnInit, DoCheck } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar, MatDialog } from '@angular/material';
import { SignUpComponent } from '../sign-up/sign-up.component';
import { AppService } from 'src/app/app.service';
import { ForgotPasswordComponent } from '../forgot-password/forgot-password.component';
import { AuthenticationService } from 'src/app/services/authentication.service';
import { NgForm, FormControl, Validators } from '@angular/forms';
import { User } from 'src/app/models/user';
import { NgxSpinnerService } from 'ngx-spinner';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit, DoCheck {

  user = new User();
  Username = new FormControl('', [
    Validators.required, ]);
  Password = new FormControl('', [
    Validators.required, ]);

  selected = 'English (Default)';
  userStatus = false;
  disabled = true;
  // Initialise neccessary intance variables
  constructor(private router: Router,
              private authenticationService: AuthenticationService,
              private snackBar: MatSnackBar,
              public dialog: MatDialog,
              private appService: AppService,
              private spinner: NgxSpinnerService
  ) { }
  // Check from cache if the user is already signed in, if yes, redirect him to dashboard
  ngOnInit() {
  }
  // Repeateadly validate the inputs, if errors, disable button, else enable it.
  ngDoCheck() {
    if (!this.Username.hasError('required') && !this.Password.hasError('required')) {
      this.disabled = false;
    } else {
      this.disabled = true;
    }
  }
  // Call the method from the authentication service for login functionality
  login(ngForm: NgForm) {
    this.spinner.show();
    this.authenticationService.login(this.user.username, this.user.password)
      .subscribe((result: string) => {
        if (result === 'self') {
          this.appService.emitConfig(true);
          this.spinner.hide();
          this.router.navigate(['/dashboard']).then(() => {
            this.openSnackBar('Login successful!', 'Ok');
          });
        } else if (result === 'notSelf') {
          this.spinner.hide();
          this.openSnackBar('Not a Self Service User!', 'Ok');
        } else if (result === 'inValid') {
          this.openSnackBar('Invalid Credentials', 'Ok');
          this.spinner.hide();
        }
      });
  }
  // A method which opens a snackbar at the bottom
  openSnackBar(message, action) {
    this.snackBar.open(message, action, {
      duration: 3000,
    });
  }
  // If the user hasn't signed up, then open a dialog for signing up
  onSignUp() {
    this.dialog.open(SignUpComponent, {
      width: '1000px',
      height: '550px'
    });
  }
  // If the user has forgotten password, then open a dialog for retrieving password.
  onForgotPassword() {
    this.dialog.open(ForgotPasswordComponent, {
      width: '500px',
    });
  }
}
