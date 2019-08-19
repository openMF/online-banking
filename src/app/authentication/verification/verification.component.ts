import { Component, OnInit, Inject } from '@angular/core';
import { MatDialogRef } from '@angular/material';
@Component({
  selector: 'app-verification',
  templateUrl: './verification.component.html',
  styleUrls: ['./verification.component.scss']
})
export class VerificationComponent implements OnInit {
  otp: string;
  constructor(
    public dialogRef: MatDialogRef<VerificationComponent>) {}
  onNoClick(): void {
    this.dialogRef.close();
  }
  ngOnInit() {
  }
  onSubmit() {
    this.dialogRef.close();
  }
}
