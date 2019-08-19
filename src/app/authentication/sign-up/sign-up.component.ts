import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialog } from '@angular/material';
import { VerificationComponent } from '../verification/verification.component';
import { UserService } from 'src/app/services/user.service';
import { NgForm } from '@angular/forms';

@Component({
  selector: 'app-sign-up',
  templateUrl: './sign-up.component.html',
  styleUrls: ['./sign-up.component.scss']
})
export class SignUpComponent implements OnInit {
  username: string;
  password: string;
  firstname: string;
  lastname: string;
  email: string;
  constructor(
    public dialogRef: MatDialogRef<SignUpComponent>,
    public dialog: MatDialog,
    private userService: UserService) {}
  onNoClick(): void {
    this.dialogRef.close();
  }
  onSignUp(ngform: NgForm) {
    this.onNoClick();
    console.log(ngform.value);
    this.userService.onCreateUser(ngform.value).subscribe((data: any) => {
      console.log(data);
    });
    this.openDialog();
  }
  ngOnInit() {
  }
  openDialog(): void {
    this.dialog.open(VerificationComponent, {
      width: '500px',
    });
  }

}
