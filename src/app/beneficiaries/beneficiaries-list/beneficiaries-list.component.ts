import { Component, OnInit, AfterViewInit, Input, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { startWith, delay, tap } from 'rxjs/operators';

@Component({
  selector: 'online-banking-beneficiaries-list',
  templateUrl: './beneficiaries-list.component.html',
  styleUrls: ['./beneficiaries-list.component.css']
})
export class BeneficiariesListComponent implements OnInit, AfterViewInit {

  @Input() beneficiaries: any;

  displayedColumns: string[] = ['id', 'accountNo', 'accountType', 'transferLimit', 'name', 'officeName', 'clientName', 'action' ];

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
    this.dataSource = new MatTableDataSource(this.beneficiaries);
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }


}
