import { Component, OnInit, AfterContentChecked, AfterViewInit, HostListener } from '@angular/core';
import * as CanvasJS from './canvasjs.min';
import { ClientService } from 'src/app/services/client.service';
import { AppService } from 'src/app/app.service';
@Component({
  selector: 'app-savings-account-pie-chart',
  templateUrl: './savings-account-pie-chart.component.html',
  styleUrls: ['./savings-account-pie-chart.component.scss']
})
export class SavingsAccountPieChartComponent implements OnInit {
  submittedAndPendingApproval = 0;
  active = 0;
  title = 'Savings Account';
  type = 'PieChart';
  data = [];
  columnNames = ['Status', 'Percentage'];
  options = {
    titleTextStyle: {
      fontSize: 30,
    },
    fontName: 'Lexend Deca',
    fontSize: 12,
  };
  width = 310;
  height = 300;

  innerWidth: number;
  // Initialise all instance variables
  constructor(private clientService: ClientService,
              private appService: AppService) { }

  ngOnInit() {
    this.onResize();
    this.getSavingsSummary();
    this.appService.emitSavingsChartObservable(false);
  }
  // Repeateadly checks width for responsiveness
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
      this.options.fontSize = 7;
      this.options.titleTextStyle.fontSize = 15;
    }
  }

// Fetch the Savings Account details from the accounts service
// Once data has arrived, intialise the graph
// Notify the app service that the chart has been loaded successfully via an Observable
  getSavingsSummary() {
    this.clientService.getClientAccounts(localStorage.getItem('id')).subscribe((data: any) => {
      for (const item of data.savingsAccounts) {
        if (item.status.submittedAndPendingApproval) {
          this.submittedAndPendingApproval = this.submittedAndPendingApproval + 1;
        }
        if (item.status.active) {
          this.active = this.active + 1;
        }
      }
    },
    err => {
      console.log('From Savings charts');
    }).add(
      () => {
        this.data = [
          ['Submitted and Pending', this.submittedAndPendingApproval],
          ['Active', this.active],
        ];
      }
    )
      .add(() => {
        this.appService.emitSavingsChartObservable(true);
      });
  }

}
