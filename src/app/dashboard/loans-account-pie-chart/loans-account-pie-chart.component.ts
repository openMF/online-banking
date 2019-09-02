import { Component, OnInit } from '@angular/core';
import { ClientService } from 'src/app/services/client.service';
import { HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AppService } from 'src/app/app.service';
@Component({
  selector: 'app-loans-account-pie-chart',
  templateUrl: './loans-account-pie-chart.component.html',
  styleUrls: ['./loans-account-pie-chart.component.scss']
})
export class LoansAccountPieChartComponent implements OnInit {
  pendingApproval = 0;
  active = 0;

  title = 'Loan Accounts';
  type = 'PieChart';
  data = [];
  columnNames = ['Status', 'Percentage'];
  options = {
    titleTextStyle: {

      fontSize: 30,
  },
  fontName: 'Lexend Deca',
  fontSize: 15,
  };
  width = 800;
  height = 300;
  innerWidth: number;
  // Initialise all instance variables
  constructor(private clientService: ClientService,
              private router: Router,
              private appService: AppService) { }

  ngOnInit() {
    this.getLoanSummary();
    this.onResize();
    this.appService.emitLoansChartObservable(false);
  }
  // Repeateadly checks the width of the screen for responsiveness
  @HostListener('window:resize', ['$event'])
  onResize() {
  this.innerWidth = window.innerWidth;
  if (this.innerWidth > 600) {
    this.width = 350;
    this.height = 350;
    this.options.fontSize =  10;
    this.options.titleTextStyle.fontSize = 20;
  } else {
    this.width = 400;
    this.height = 300;
    this.options.fontSize =  9;
    this.options.titleTextStyle.fontSize = 15;
  }
  }

// Fetch the loan Account details from the accounts service
// Once data has arrived, intialise the graph
// Notify the app service that the chart has been loaded successfully via an Observable
getLoanSummary() {
  this.clientService.getClientAccounts(localStorage.getItem('id')).subscribe((data: any) => {
    for (const item of data.loanAccounts) {
      if (item.status.pendingApproval) {
        this.pendingApproval = this.pendingApproval + item.status.pendingApproval;
      }
      if (item.status.active) {
        this.active = this.active + item.status.active;
      }
    }
  },
  err => {
    console.log('From loan charts');
  }).add(
    () => {
      this.data = [
        ['Submitted and Pending', this.pendingApproval],
        ['Active', this.active],
     ];
    }
  )
  .add(() => {
    this.appService.emitLoansChartObservable(true);
  });
  }
}
