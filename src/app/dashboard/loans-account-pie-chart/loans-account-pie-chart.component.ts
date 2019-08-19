import { Component, OnInit } from '@angular/core';
import * as CanvasJS from './canvasjs.min';
import { AccountsService } from 'src/app/services/accounts.service';

@Component({
  selector: 'app-loans-account-pie-chart',
  templateUrl: './loans-account-pie-chart.component.html',
  styleUrls: ['./loans-account-pie-chart.component.scss']
})
export class LoansAccountPieChartComponent implements OnInit {
  pendingApproval = 0;
  waitingForDisbursal = 0;
  active = 0;
  closedObligationsMet = 0;
  closedWrittenOff = 0;
  closedRescheduled = 0;
  closed = 0;
  overpaid = 0;

  title = 'Loan Accounts';
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
    for (const item of data.loanAccounts) {
      if (item.status.pendingApproval) {
        this.pendingApproval = this.pendingApproval + item.status.pendingApproval;
      }
      if (item.status.waitingForDisbursal) {
        this.waitingForDisbursal = this.waitingForDisbursal + item.status.waitingForDisbursal;
      }
      if (item.status.active) {
        this.active = this.active + item.status.active;
      }
      if (item.status.closedObligationsMet) {
        this.closedObligationsMet = this.closedObligationsMet + item.status.closedObligationsMet;
      }
      if (item.status.closedWrittenOff) {
        this.closedWrittenOff = this.closedWrittenOff + item.status.closedWrittenOff;
      }
      if (item.status.closedRescheduled) {
        this.closedRescheduled = this.closedRescheduled + item.status.closedRescheduled;
      }
      if (item.status.closed) {
        this.closed = this.closed + item.status.closed;
      }
      if (item.status.overpaid) {
        this.overpaid = this.overpaid + item.status.overpaid;
      }
    }
  }).add(
    () => {
      this.data = [
        ['Pending approval', this.pendingApproval],
        ['Waiting for disbursal', this.waitingForDisbursal],
        ['Active', this.active],
        ['Closed obligations met ', this.closedObligationsMet],
        ['Closed written off', this.closedWrittenOff],
        ['Closed rescheduled', this.closedRescheduled],
        ['Closed', this.closed],
        ['overpaid', this.overpaid],
     ];
    }
  );
  }
}
