import { __decorate } from "tslib";
import { Component, Input, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { startWith, delay, tap } from 'rxjs/operators';
let ShareAccountsListComponent = class ShareAccountsListComponent {
    constructor() {
        this.displayedColumns = ['accountNo', 'status', 'type', 'approvedShares', 'pendingShares'];
    }
    ngOnInit() {
    }
    ngAfterViewInit() {
        /* Refer: https://blog.angular-university.io/angular-debugging/  workaround with delayed data binding */
        this.paginator.page
            .pipe(startWith(null), delay(0), tap(() => this.setAccountsTable())).subscribe();
    }
    setAccountsTable() {
        this.dataSource = new MatTableDataSource(this.shareAccounts);
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
], ShareAccountsListComponent.prototype, "shareAccounts", void 0);
__decorate([
    ViewChild(MatPaginator)
], ShareAccountsListComponent.prototype, "paginator", void 0);
__decorate([
    ViewChild(MatSort)
], ShareAccountsListComponent.prototype, "sort", void 0);
ShareAccountsListComponent = __decorate([
    Component({
        selector: 'online-banking-share-accounts-list',
        templateUrl: './share-accounts-list.component.html',
        styleUrls: ['./share-accounts-list.component.css']
    })
], ShareAccountsListComponent);
export { ShareAccountsListComponent };
//# sourceMappingURL=share-accounts-list.component.js.map