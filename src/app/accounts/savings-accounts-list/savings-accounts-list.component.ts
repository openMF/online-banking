import { Component, OnInit, Input, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { startWith, delay, tap } from 'rxjs/operators';

@Component({
  selector: 'online-banking-savings-accounts-list',
  templateUrl: './savings-accounts-list.component.html',
  styleUrls: ['./savings-accounts-list.component.css']
})
export class SavingsAccountsListComponent implements OnInit, AfterViewInit {

  @Input() savingsAccounts: any;

  displayedColumns: string[] = ['accountNo', 'status', 'type' , 'accountBalance', 'submittedOn' ];

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

  /**
   * Initializes the data source, paginator and sorter for Permissions table
   */
  setAccountsTable() {
    this.dataSource = new MatTableDataSource(this.savingsAccounts);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }
  /**
   * Filters data in Permissions table based on passed value.
   * @param {string} filterValue Value to filter data
   */
  applyFilter(filterValue: string) {
    this.dataSource.filter = filterValue.trim().toLowerCase();
  }

}
