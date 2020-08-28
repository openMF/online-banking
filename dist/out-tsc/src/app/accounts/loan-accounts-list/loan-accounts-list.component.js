import { __decorate } from "tslib";
import { Component, Input, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { startWith, delay, tap } from 'rxjs/operators';
let LoanAccountsListComponent = class LoanAccountsListComponent {
    constructor() {
        this.displayedColumns = ['accountNo', 'status', 'originalLoan', 'loanBalance', 'amountPaid', 'loanType'];
    }
    ngOnInit() {
    }
    ngAfterViewInit() {
        /* Refer: https://blog.angular-university.io/angular-debugging/  workaround with delayed data binding */
        this.paginator.page
            .pipe(startWith(null), delay(0), tap(() => this.setAccountsTable())).subscribe();
    }
    setAccountsTable() {
        this.dataSource = new MatTableDataSource(this.loanAccounts);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }
    /**
    * Filters data in Permissions table based on passed value.
    * @param {string} filterValue Value to filter data.
    */
    applyFilter(filterValue) {
        this.dataSource.filter = filterValue.trim().toLowerCase();
    }
};
__decorate([
    Input()
], LoanAccountsListComponent.prototype, "loanAccounts", void 0);
__decorate([
    ViewChild(MatPaginator)
], LoanAccountsListComponent.prototype, "paginator", void 0);
__decorate([
    ViewChild(MatSort)
], LoanAccountsListComponent.prototype, "sort", void 0);
LoanAccountsListComponent = __decorate([
    Component({
        selector: 'online-banking-loan-accounts-list',
        templateUrl: './loan-accounts-list.component.html',
        styleUrls: ['./loan-accounts-list.component.css']
    })
], LoanAccountsListComponent);
export { LoanAccountsListComponent };
//# sourceMappingURL=loan-accounts-list.component.js.map