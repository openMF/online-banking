import { AfterContentInit, Component, OnInit, AfterContentChecked, DoCheck } from '@angular/core';
import { ClientService } from '../services/client.service';
import { Router } from '@angular/router';
import { AppService } from '../app.service';
import { MatSnackBar } from '@angular/material';
import { AuthenticationService } from '../services/authentication.service';


@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterContentChecked, DoCheck {
  show = true;
  totalLoanAccounts = 0;
  totalSavingsAccounts = 0;
  totalSharesAccounts = 0;
  totalAccounts = 0;
  loansBalance = 0;
  savingsBalance = 0;
  shares = 0;
  totalLoan = 0;
  loanAccounts: any[] = [];
  savingsAccounts: any[] = [];
  shareAccounts: any[] = [];
  chartFlag = false;
  // Initialise all instance variables
  constructor(
    private clientService: ClientService,
    private router: Router,
    private appService: AppService,
    private snackBar: MatSnackBar,
    private authenticationService: AuthenticationService
  ) {
  }
  // Calculate the total accounts after the number of Savings, Loan and Shares accounts have been calculated
  ngAfterContentChecked() {
    this.totalAccounts = this.totalSavingsAccounts + this.totalLoanAccounts + this.totalSharesAccounts;

  }
  // Notify the app service spinner observable that data is loaded.
  // once the data has been loaded, the loading screen is hidden.
  ngDoCheck() {
    if (!this.totalAccounts || !this.totalLoanAccounts || !this.totalSavingsAccounts &&
      this.totalSharesAccounts || !this.savingsBalance || !this.loansBalance) {
      this.appService.emitSpinnerObservable(true);
    } else {
      this.appService.emitSpinnerObservable(false);
    }
  }
  // Open the snack bar at the bottom
  openSnackBar(message, action) {
    this.snackBar.open(message, action, {
      duration: 2000,
    });
  }

  // Fetching client account summary
  ngOnInit() {
    this.clientService.getClientAccounts(localStorage.getItem('id')).subscribe((data: any) => {
      // Check if user has loan accounts
      if (data.loanAccounts) {
        // Find total number of loan accounts
        this.totalLoanAccounts = data.loanAccounts.length;
        this.loansBalance = data.loanAccounts.reduce(this.getTotalLoan, 0).toFixed(2);
      }

      // Check if user has savings account
      if (data.savingsAccounts) {
        // Calculate total number of savings accounts
        this.totalSavingsAccounts = data.savingsAccounts.length;
        this.savingsBalance = data.savingsAccounts.reduce(this.getTotalSavings, 0).toFixed(2);
      }
      if (data.shareAccounts) {
        this.totalSharesAccounts = data.shareAccounts.length;
      }
      this.savingsAccounts = data.savingsAccounts;
      this.loanAccounts = data.loanAccounts;
      this.shareAccounts = data.shareAccounts;
    },
    err => {
      console.log('From Dashboard');
    });

  }
  // This method is passed to reducer function above, which calculates total Loan Balance
  getTotalLoan(total, acc) {
    if (acc.loanBalance) {
      return total + acc.loanBalance;
    } else {
      return total;
    }
  }
  // This method is passes to the reducer function above, which calculates total Savings
  getTotalSavings(total, acc) {
    if (acc.accountBalance) {
      return total + acc.accountBalance;
    } else {
      return total;
    }
  }
}
