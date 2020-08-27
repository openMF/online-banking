import { Component, OnInit, Input, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { startWith, delay, tap } from 'rxjs/operators';

@Component({
  selector: 'online-banking-share-accounts-list',
  templateUrl: './share-accounts-list.component.html',
  styleUrls: ['./share-accounts-list.component.css']
})
export class ShareAccountsListComponent implements OnInit, AfterViewInit {

  @Input() shareAccounts: any;

  displayedColumns: string[] = ['accountNo', 'status', 'type', 'approvedShares', 'pendingShares' ];

  dataSource: MatTableDataSource<any>;

  @ViewChild(MatPaginator) paginator: MatPaginator;

  @ViewChild(MatSort) sort: MatSort;

  constructor() { }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    /* Refer: https://blog.angular-university.io/angular-debugging/  workaround with delayed data binding */
    this.paginator.page
          .pipe(
            startWith(null),
            delay(0),
            tap(() => this.setAccountsTable()
            )
          ).subscribe();
  }

  setAccountsTable() {
    this.dataSource = new MatTableDataSource(this.shareAccounts);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }
  /**
   * Filters data in Permissions table based on passed value
   * @param filterValue
   */
  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

}
