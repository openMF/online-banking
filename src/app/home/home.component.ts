import {Component, OnInit} from '@angular/core';
import {HomeService} from './home.service';
import {Router} from '@angular/router';

@Component({
  selector: 'self-service-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss']
})
export class HomeComponent implements OnInit {
  totalAccounts: number;
  loanAccounts = [];
  savingsAccounts = [];
  shareAccounts = [];
  totalSavings = '0';
  totalLoan = '0';
  // TODO: Dim the screen while values are loading
  loading = true;

  constructor(private homeService: HomeService,
              private router: Router) {
  }

  ngOnInit(): void {
    this.setAccounts();
  }

  setAccounts(): void {
    this.homeService.getAccounts().subscribe((accounts) => {
        console.log(accounts);
        const {loanAccounts, savingsAccounts, shareAccounts} = accounts;
        this.loanAccounts = loanAccounts;
        this.savingsAccounts = savingsAccounts;
        this.shareAccounts = shareAccounts;
        this.totalAccounts = this.loanAccounts.length + this.savingsAccounts.length + this.shareAccounts.length;
        let savingsBalance = 0;
        this.savingsAccounts.forEach((account) => {
          const {accountBalance} = account;
          if (accountBalance) {
            savingsBalance += parseInt(accountBalance, 10);
          }
        });
        this.totalSavings = savingsBalance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        let loansBalance = 0;
        this.loanAccounts.forEach((account) => {
          const {loanBalance} = account;
          if (loanBalance) {
            loansBalance += loanBalance;
          }
        });
        this.totalLoan = loansBalance.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        this.loading = false;
      },
      (error => {
        console.log(error);
        this.router.navigate(['/login'], {replaceUrl: true});
      }));
  }
}
