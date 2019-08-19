import {AfterContentInit, Component, OnInit, AfterContentChecked} from '@angular/core';
import { LoanService } from '../services/loan.service';
import { SavingsService } from '../services/savings.service';
import { SharesService } from '../services/shares.service';
import { AccountsService } from '../services/accounts.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit, AfterContentInit, AfterContentChecked {
  items = [1, 2, 3, 4];
  items2 = [1, 2, 3];
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

  constructor(private loanService: LoanService,
              private savingsService: SavingsService,
              private sharesService: SharesService,
              private accountsService: AccountsService,
              private router: Router) {
               }
  ngAfterContentInit() {
    this.show = false;
  }
  ngAfterContentChecked() {
    this.totalAccounts = this.totalSavingsAccounts + this.totalLoanAccounts + this.totalSharesAccounts;
  }
  // Fetching client account summary
  ngOnInit() {
    this.accountsService.getClientAccounts().subscribe((data: any) => {

      // Check if user has loan accounts
      if (data.loanAccounts) {
        // Find totol number of loan accounts
        this.totalLoanAccounts = data.loanAccounts.length;
        // Find sum of loan amt assured.
        for (const item of data.loanAccounts) {
          if (item.loanBalance) {
            this.loansBalance = this.loansBalance + item.originalLoan;
          }
        }
      }

      // Check if user has savings account
      if (data.savingsAccounts) {
        // Calculate total number of savings accounts
        this.totalSavingsAccounts = data.savingsAccounts.length;
        // find sum of all Savings Account Balances
        for (const item of data.savingsAccounts) {
        if (item.accountBalance) {
            this.savingsBalance = this.savingsBalance + item.accountBalance;
        }
    }
      }
      if (data.shareAccounts) {
        this.totalSharesAccounts = data.shareAccounts.length;
      }
      this.savingsAccounts = data.savingsAccounts;
      this.loanAccounts = data.loanAccounts;
      this.shareAccounts = data.shareAccounts;
    });

  }

}
