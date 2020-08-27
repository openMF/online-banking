import { __decorate } from "tslib";
import { Component, Input } from '@angular/core';
import Chart from 'chart.js';
let LoanOverviewPieComponent = class LoanOverviewPieComponent {
    constructor() { }
    ngOnInit() {
        const labels = [];
        const data = [];
        console.log('From the loan pie chart component', this.loanAccounts);
        this.loanAccounts.forEach((account) => {
            if (labels.indexOf(account.status.value) !== -1) {
                data[labels.indexOf(account.status.value)] += 1;
            }
            else {
                data.push(1);
                labels.push(account.status.value);
            }
        });
        console.log('labels', labels);
        console.log('data', data);
        this.chart = new Chart('loan-pie', {
            type: 'pie',
            data: {
                labels,
                datasets: [{
                        backgroundColor: ['yellow', 'blue', 'green', 'pink', 'red', 'green', 'yellow', 'blue', 'pink'],
                        data
                    }]
            },
            options: {
                layout: {
                    padding: {
                        top: 10,
                        bottom: 15
                    }
                }
            }
        });
    }
};
__decorate([
    Input()
], LoanOverviewPieComponent.prototype, "loanAccounts", void 0);
LoanOverviewPieComponent = __decorate([
    Component({
        selector: 'online-banking-loan-overview-pie',
        templateUrl: './loan-overview-pie.component.html',
        styleUrls: ['./loan-overview-pie.component.css']
    })
], LoanOverviewPieComponent);
export { LoanOverviewPieComponent };
//# sourceMappingURL=loan-overview-pie.component.js.map