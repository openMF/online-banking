import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { LoanAccount, SavingsAccount, ShareAccount, ClientAccounts } from './accounts.model';

@Component({
  selector: 'online-banking-accounts',
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.css']
})
export class AccountsComponent implements OnInit {

  loanAccounts: LoanAccount[] = [];
  savingsAccounts: SavingsAccount[] = [];
  shareAccounts: ShareAccount[] = [];

  constructor(private route: ActivatedRoute) {
    this.route.data.subscribe((data: { accounts: ClientAccounts }) => {
      this.loanAccounts = data.accounts.loanAccounts || [];
      this.savingsAccounts = data.accounts.savingsAccounts || [];
      this.shareAccounts = data.accounts.shareAccounts || [];
    });
  }

  ngOnInit(): void {
  }
}
