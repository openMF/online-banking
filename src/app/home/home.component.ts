import { Component, OnInit } from '@angular/core';
import { HomeService } from './home.service';
import { Router, ActivatedRoute } from '@angular/router';
import { ClientAccounts, LoanAccount, SavingsAccount, ShareAccount } from '../accounts/accounts.model';

@Component({
  selector: 'online-banking-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  totalAccounts = 0;
  loanAccounts: LoanAccount[] = [];
  savingsAccounts: SavingsAccount[] = [];
  shareAccounts: ShareAccount[] = [];
  totalSavings = '0';
  totalLoan = '0';
  // TODO: Dim the screen while values are loading
  loading = true;

  constructor(private homeService: HomeService,
              private route: ActivatedRoute,
              private router: Router) {
    this.route.data.subscribe((data: { accounts: ClientAccounts }) => {
      const { loanAccounts, savingsAccounts, shareAccounts } = data.accounts;
      this.loanAccounts = loanAccounts || [];
      this.savingsAccounts = savingsAccounts || [];
      this.shareAccounts = shareAccounts || [];
    });
  }

  ngOnInit(): void {
    console.log('from ngoninit for home.component', 'loan Accounts ', this.loanAccounts, 'share Accounts ', this.shareAccounts, 'savings Accounts ', this.savingsAccounts);
    this.setAccounts();
  }

  setAccounts(): void {
    this.totalAccounts = this.loanAccounts.length + this.savingsAccounts.length + this.shareAccounts.length;
    console.log('From the set accounts method here is the total accounts', this.totalAccounts);
    
    let savingsBalance = 0;
    this.savingsAccounts.forEach((account) => {
      if (account.accountBalance) {
        // Handle string parsing if it comes as string, or use directly if number
        savingsBalance += Number(account.accountBalance);
      }
    });
    this.totalSavings = savingsBalance.toLocaleString('en-US');
    
    let loansBalance = 0;
    this.loanAccounts.forEach((account) => {
      if (account.loanBalance) {
        loansBalance += Number(account.loanBalance);
      }
    });
    this.totalLoan = loansBalance.toLocaleString('en-US');
    this.loading = false;
  }
}
