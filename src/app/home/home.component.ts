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
    
    this.totalSavings = this.formatBalances(this.savingsAccounts, 'accountBalance');
    this.totalLoan = this.formatBalances(this.loanAccounts, 'loanBalance');
    this.loading = false;
  }

  private formatBalances(accounts: any[], balanceKey: string): string {
    const totals: { [code: string]: { amount: number, symbol: string } } = {};
    
    accounts.forEach(account => {
      const balance = account[balanceKey];
      if (balance !== undefined && balance !== null) {
        const code = account.currency?.code || 'UNK';
        const symbol = account.currency?.displaySymbol || '';
        if (!totals[code]) {
          totals[code] = { amount: 0, symbol: symbol };
        }
        totals[code].amount += Number(balance);
      }
    });

    const entries = Object.values(totals);
    if (entries.length === 0) return '0';
    return entries.map(t => `${t.symbol} ${t.amount.toLocaleString('en-US')}`).join(' | ');
  }
}
