import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription, of } from 'rxjs';
import { switchMap, catchError, tap } from 'rxjs/operators';
import { AccountsService } from '../accounts.service';
import { ShareAccountDetails } from '../accounts.model';

@Component({
  selector: 'app-share-account-details',
  templateUrl: './share-account-details.component.html',
  styleUrls: ['./share-account-details.component.css']
})
export class ShareAccountDetailsComponent implements OnInit, OnDestroy {

  shareAccount: ShareAccountDetails | null = null;
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
          return this.accountsService.getShareAccount(id).pipe(
            catchError(err => {
              this.error = 'Failed to load share account details.';
              console.error(err);
              return of(null);
            })
          );
        }
        return of(null);
      })
    ).subscribe((account: ShareAccountDetails | null) => {
      if (account) {
        this.shareAccount = account;
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
