import { Component, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { ActivatedRoute } from '@angular/router';
import { startWith, delay, tap } from 'rxjs/operators';

@Component({
  selector: 'online-banking-charges-list',
  templateUrl: './charges-list.component.html',
  styleUrls: ['./charges-list.component.css']
})
export class ChargesListComponent implements OnInit, AfterViewInit {

  charges: any;
  displayedColumns: string[] = ['name', 'amount', 'amountOutstanding', 'amountPaid', 'amountWaived', 'writtenOff', 'dueDate'];
  datasource: MatTableDataSource<any>;
  @ViewChild(MatPaginator) paginator: MatPaginator;
  @ViewChild(MatSort) sort: MatSort;

  constructor(private route: ActivatedRoute) {
    this.route.data.subscribe((data: { charges: any }) => {
      this.charges = data.charges;
    });
   }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
  /* Refer: https://blog.angular-university.io/angular-debugging/  workaround with delayed data binding */
  this.paginator.page
    .pipe(
      startWith(null),
      delay(0),
      tap(() => this.setChargesTable()
      )
    ).subscribe();
  }

  setChargesTable() {
    this.datasource = new MatTableDataSource(this.charges.pageItems);
    this.datasource.paginator = this.paginator;
    this.datasource.sort = this.sort;
  }

}
