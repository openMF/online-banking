import { __decorate } from "tslib";
import { Component, Input, ViewChild } from '@angular/core';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
let BeneficiariesListComponent = class BeneficiariesListComponent {
    constructor() {
        this.displayedColumns = ['accountNo'];
    }
    ngOnInit() {
    }
    ngAfterViewInit() {
        this.setAccountsTable();
    }
    setAccountsTable() {
        this.dataSource = new MatTableDataSource(this.beneficiaries);
        this.dataSource.paginator = this.paginator;
        this.dataSource.sort = this.sort;
    }
};
__decorate([
    Input()
], BeneficiariesListComponent.prototype, "beneficiaries", void 0);
__decorate([
    ViewChild(MatPaginator)
], BeneficiariesListComponent.prototype, "paginator", void 0);
__decorate([
    ViewChild(MatSort)
], BeneficiariesListComponent.prototype, "sort", void 0);
BeneficiariesListComponent = __decorate([
    Component({
        selector: 'online-banking-beneficiaries-list',
        templateUrl: './beneficiaries-list.component.html',
        styleUrls: ['./beneficiaries-list.component.css']
    })
], BeneficiariesListComponent);
export { BeneficiariesListComponent };
//# sourceMappingURL=beneficiaries-list.component.js.map