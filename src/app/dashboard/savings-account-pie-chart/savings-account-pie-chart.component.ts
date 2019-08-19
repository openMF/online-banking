import { Component, OnInit, AfterContentChecked, AfterViewInit } from '@angular/core';
import * as CanvasJS from './canvasjs.min';
import { AccountsService } from 'src/app/services/accounts.service';
@Component({
  selector: 'app-savings-account-pie-chart',
  templateUrl: './savings-account-pie-chart.component.html',
  styleUrls: ['./savings-account-pie-chart.component.scss']
})
export class SavingsAccountPieChartComponent implements OnInit {
  submittedAndPendingApproval = 0;
  approved = 0;
  rejected = 0;
  withdrawnByApplicant = 0;
  active = 0;
  closed = 0;
  prematureClosed = 0;
  transferInProgress = 0;
  transferOnHold = 0;
  matured = 0;

  title = 'Savings Account';
  type = 'PieChart';
  data = [];
  columnNames = ['Status', 'Percentage'];
  options = {
    is3D: false
  };
  width = 402;
  height = 400 ;
  constructor(private accountsService: AccountsService) { }

  ngOnInit() {
    this.getLoanSummary();
  }
getLoanSummary() {
  this.accountsService.getClientAccounts().subscribe((data: any) => {
    for (const item of data.savingsAccounts) {
      if (item.status.submittedAndPendingApproval) {
        this.submittedAndPendingApproval = this.submittedAndPendingApproval + 1;
      }
      if (item.status.approved) {
        this.approved = this.approved + 1;
      }
      if (!item.status.rejected) {
        this.rejected = this.rejected + 1;
      }
      if (!item.status.withdrawnByApplicant) {
        this.withdrawnByApplicant = this.withdrawnByApplicant + 1;
      }
      if (!item.status.active) {
        this.active = this.active + 1;
      }
      if (!item.status.closed) {
        this.closed = this.closed + 1;
      }
      if (!item.status.prematureClosed) {
        this.prematureClosed = this.prematureClosed + 1;
      }
      if (!item.status.transferInProgress) {
        this.transferInProgress = this.transferInProgress + 1;
      }
      if (!item.status.transferOnHold) {
        this.transferOnHold = this.transferOnHold + 1;
      }
      if (!item.status.matured) {
        this.matured = this.matured + 1;
      }
      console.log(this.submittedAndPendingApproval);
    }
  }).add(
    () => {
      this.data = [
        ['Submitted', this.submittedAndPendingApproval],
        ['Approved', this.approved],
        ['Rejected', this.rejected],
        ['Withdrawn ', this.withdrawnByApplicant],
        ['Active', this.active],
        ['Closed', this.closed],
        ['Premature Closed', this.prematureClosed],
        ['Transfer In Progress', this.transferInProgress],
        ['Transfer On Hold', this.transferOnHold],
        ['Matured', this.matured]
     ];
    }
  );
  }

}
