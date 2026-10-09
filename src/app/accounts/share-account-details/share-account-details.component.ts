import { Component, OnInit, OnDestroy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Subscription } from 'rxjs';
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
    this.accountsService.getShareAccount(id).subscribe({
      next: (account: ShareAccountDetails) => {
        this.shareAccount = account;
        this.loading = false;
      },
      error: (err) => {
        this.error = 'Failed to load share account details.';
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
