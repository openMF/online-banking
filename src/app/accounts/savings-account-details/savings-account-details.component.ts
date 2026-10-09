import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
import { AccountsService } from '../accounts.service';
import { SavingsAccountDetails } from '../accounts.model';

@Component({
  selector: 'online-banking-savings-account-details',
  templateUrl: './savings-account-details.component.html',
  styleUrls: ['./savings-account-details.component.css']
})
export class SavingsAccountDetailsComponent implements OnInit, OnDestroy {

  savingsAccount: SavingsAccountDetails | null = null;
  loading = true;
  error = '';
  private routeSub: Subscription;

  constructor(
    private route: ActivatedRoute,
    private accountsService: AccountsService
  ) { }

  ngOnInit(): void {
    this.routeSub = this.route.paramMap.subscribe(params => {
      const id = params.get('id');
      if (id) {
        this.fetchAccountDetails(id);
      }
    });
  }

  fetchAccountDetails(id: string): void {
    this.loading = true;
    this.error = '';
    this.accountsService.getSavingsAccount(id).subscribe({
      next: (account: SavingsAccountDetails) => {
        this.savingsAccount = account;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load savings account details.';
        this.loading = false;
        console.error(err);
      }
    });
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

}
