import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthorizationService } from 'src/app/services/authorization.service';
import { MatSnackBar, MatDialog } from '@angular/material';
import { SignUpComponent } from '../sign-up/sign-up.component';
import { AppService } from 'src/app/app.service';
import { ForgotPasswordComponent } from '../forgot-password/forgot-password.component';
import { AuthenticationService } from 'src/app/services/authentication.service';
import { NgForm } from '@angular/forms';
export interface DialogData {
  animal: string;
  name: string;
}
@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent implements OnInit {

  username: string;
  password: string;
  animal: string;
  name: string;

  selected = 'English (Default)';
  userStatus = false;
  constructor(private router: Router,
              private authenticationService: AuthenticationService,
              private snackBar: MatSnackBar,
              public dialog: MatDialog,
              private appService: AppService
  ) {}

  ngOnInit() {
  }
  login(ngForm: NgForm) {
    console.log(ngForm.value);
    this.userStatus = this.authenticationService.login(ngForm.value.username, ngForm.value.password);
    if (this.userStatus === true) {
      this.router.navigate(['/dashboard']);
    } else {
      this.router.navigate(['']);
    }
    // this.authenticationService.login(ngForm.value.username, ngForm.value.password)
    // .subscribe((data: any) => {
    //   if (data) {
    //     this.appService.emitConfig(true);
    //     localStorage.setItem('token', data.base64EncodedAuthenticationKey);
    //     this.router.navigate(['/dashboard']).then();
    //   } else {
    //     this.appService.emitConfig(false);
    //     this.openSnackBar('Invalid Credentials', 'close');
    //     this.router.navigate(['/login']).then();
    //   }
    // });
  }

  openSnackBar(message, action) {
    this.snackBar.open(message, action, {
      duration: 2000,
    });
  }

  onSignUp() {
    this.openDialog();
  }
  openDialog(): void {
    this.dialog.open(SignUpComponent, {
      width: '600px',
      height: '700px'
    });
  }
  onForgotPassword() {
    this.dialog.open(ForgotPasswordComponent, {
      width: '500px',
    });
  }
}
