import { __decorate } from "tslib";
import { Component, Input, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { startWith, delay, tap } from 'rxjs/operators';
let SavingsAccountsListComponent = class SavingsAccountsListComponent {
    constructor() {
        this.displayedColumns = ['accountNo', 'status', 'type', 'accountBalance', 'submittedOn'];
    }
    ngOnInit() {
    }
    ngAfterViewInit() {
        /* Refer: https://blog.angular-university.io/angular-debugging/  workaround with delayed data binding */
        this.paginator.page
            .pipe(startWith(null), delay(0), tap(() => this.setAccountsTable())).subscribe();
    }
    /**
     * Initializes the data source, paginator and sorter for Permissions table.
    */
    setAccountsTable() {
        this.dataSource = new MatTableDataSource(this.savingsAccounts);
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
], SavingsAccountsListComponent.prototype, "savingsAccounts", void 0);
__decorate([
    ViewChild(MatPaginator)
], SavingsAccountsListComponent.prototype, "paginator", void 0);
__decorate([
    ViewChild(MatSort)
], SavingsAccountsListComponent.prototype, "sort", void 0);
SavingsAccountsListComponent = __decorate([
    Component({
        selector: 'online-banking-savings-accounts-list',
        templateUrl: './savings-accounts-list.component.html',
        styleUrls: ['./savings-accounts-list.component.css']
    })
], SavingsAccountsListComponent);
export { SavingsAccountsListComponent };
//# sourceMappingURL=savings-accounts-list.component.js.map