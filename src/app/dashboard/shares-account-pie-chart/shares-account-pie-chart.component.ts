import { Component, OnInit, HostListener } from '@angular/core';
import { ClientService } from 'src/app/services/client.service';
import { AppService } from 'src/app/app.service';

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
    titleTextStyle: {
      fontSize: 30,
    },
    fontSize: 12,
    fontName: 'Lexend Deca',

  };
  width = 310;
  height = 300;
  submittedAndPendingApproval: any;
  active = 0;
  innerWidth: number;
  constructor(private clientService: ClientService,
              private appService: AppService) { }
  ngOnInit() {
    this.getSharesSummary();
    this.onResize();
    this.appService.emitSharesChartObservable(false);
  }
  // Repeateadly check the inner width for responsiveness
  @HostListener('window:resize', ['$event'])
  onResize() {
    this.innerWidth = window.innerWidth;
    if (this.innerWidth > 600) {
      this.width = 350;
      this.height = 350;
      this.options.fontSize = 10;
      this.options.titleTextStyle.fontSize = 20;
    } else {
      this.width = 400;
      this.height = 300;
      this.options.fontSize = 9;
      this.options.titleTextStyle.fontSize = 15;
    }
  }
  // Fetch the Shares accounts details from the accounts service
  // Once data has arrived, intialise the graph
  // Notify the app service that the chart has been loaded successfully via an Observable
  getSharesSummary() {
    this.clientService.getClientAccounts(localStorage.getItem('id')).subscribe((data: any) => {
      for (const item of data.shareAccounts) {
        if (item.status.submittedAndPendingApproval) {
          this.submittedAndPendingApproval = this.submittedAndPendingApproval + 1;
        }
        if (item.status.active) {
          this.active = this.active + 1;
        }
      }
    },
    err => {
      console.log('From Shares charts');
    }).add(
      () => {
        this.data = [
          ['Submitted', this.submittedAndPendingApproval],
          ['Active', this.active],
        ];
      }
    )
      .add(() => {
        this.appService.emitSharesChartObservable(true);
      });
  }

}
