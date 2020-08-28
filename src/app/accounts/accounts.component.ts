import {AfterViewInit, Component, OnInit, ViewChild, ViewChildren} from '@angular/core';
import {ActivatedRoute, Router} from '@angular/router';
import {MatTableDataSource} from '@angular/material/table';
import {MatPaginator} from '@angular/material/paginator';
import {MatSort} from '@angular/material/sort';

@Component({
  selector: 'online-banking-accounts',
  templateUrl: './accounts.component.html',
  styleUrls: ['./accounts.component.css']
})
export class AccountsComponent implements OnInit {


  loanAccounts: any;

  savingsAccounts: any;

  shareAccounts: any;


  constructor(private route: ActivatedRoute,
              private router: Router) {
    this.route.data.subscribe((data: { accounts: any }) => {
      this.loanAccounts = data.accounts.loanAccounts;
      this.savingsAccounts = data.accounts.savingsAccounts;
      this.shareAccounts = data.accounts.shareAccounts;
    });
  }

  ngOnInit(): void {

  }
}
