import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';
import { AccountsService } from '../accounts.service';
import { LoanAccountDetails } from '../accounts.model';

@Component({
  selector: 'online-banking-loan-account-details',
  templateUrl: './loan-account-details.component.html',
  styleUrls: ['./loan-account-details.component.css']
})
export class LoanAccountDetailsComponent implements OnInit, OnDestroy {

  loanAccount: LoanAccountDetails | null = null;
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
          return this.accountsService.getLoanAccount(id).pipe(
            catchError(err => {
              this.error = 'Failed to load loan account details.';
              console.error(err);
              return of(null);
            })
          );
        }
        return of(null);
      })
    ).subscribe((account: LoanAccountDetails | null) => {
      if (account) {
        this.loanAccount = account;
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
