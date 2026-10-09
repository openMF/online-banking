import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';
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
    this.routeSub = this.route.paramMap.pipe(
      tap(() => {
        this.loading = true;
        this.error = '';
      }),
      switchMap(params => {
        const id = params.get('id');
        if (id) {
          return this.accountsService.getSavingsAccount(id).pipe(
            catchError(err => {
              this.error = 'Failed to load savings account details.';
              console.error(err);
              return of(null);
            })
          );
        }
        return of(null);
      })
    ).subscribe((account: SavingsAccountDetails | null) => {
      if (account) {
        this.savingsAccount = account;
      }
      this.loading = false;
    });
  }

  ngOnDestroy(): void {
    if (this.routeSub) {
      this.routeSub.unsubscribe();
    }
  }

}
