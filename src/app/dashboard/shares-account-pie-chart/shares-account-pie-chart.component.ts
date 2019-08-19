import { Component, OnInit } from '@angular/core';
import { AccountsService } from 'src/app/services/accounts.service';

@Component({
  selector: 'app-shares-account-pie-chart',
  templateUrl: './shares-account-pie-chart.component.html',
  styleUrls: ['./shares-account-pie-chart.component.scss']
})
export class SharesAccountPieChartComponent implements OnInit {
  title = 'Shares Accounts';
  type = 'PieChart';
  data = [];
  columnNames = ['Status', 'Percentage'];
  options = {
    is3D: false
  };
  width = 402;
  height = 400 ;
  submittedAndPendingApproval: any;
  approved = 0;
  rejected = 0;
  active = 0;
  closed = 0;
  constructor(private accountsService: AccountsService) { }
  ngOnInit() {
    this.getSharesSummary();
  }
  getSharesSummary() {
    this.accountsService.getClientAccounts().subscribe((data: any) => {
      for (const item of data.shareAccounts) {
        if (item.status.submittedAndPendingApproval) {
          this.submittedAndPendingApproval = this.submittedAndPendingApproval + 1;
        }
        if (item.status.approved) {
          this.approved = this.approved + 1;
        }
        if (!item.status.rejected) {
          this.rejected = this.rejected + 1;
        }
        if (!item.status.active) {
          this.active = this.active + 1;
        }
        if (!item.status.closed) {
          this.closed = this.closed + 1;
        }
      }
    }).add(
      () => {
        this.data = [
          ['Submitted', this.submittedAndPendingApproval],
          ['Approved', this.approved],
          ['Rejected', this.rejected],
          ['Active', this.active],
          ['Closed', this.closed],
       ];
      }
    );
    }

}
