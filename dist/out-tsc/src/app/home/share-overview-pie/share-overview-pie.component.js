import { __decorate } from "tslib";
import { Component, Input } from '@angular/core';
import Chart from 'chart.js';
let ShareOverviewPieComponent = class ShareOverviewPieComponent {
    constructor() { }
    ngOnInit() {
        console.log(this.shareAccounts);
        const labels = [];
        const data = [];
        this.shareAccounts.forEach((account) => {
            if (account.status.value in labels) {
                data[labels.indexOf(account.status.value)] += 1;
            }
            else {
                data.push(1);
                labels.push(account.status.value);
            }
        });
        console.log('labels', labels);
        console.log('data', data);
        this.chart = new Chart('share-pie', {
            type: 'pie',
            data: {
                labels,
                datasets: [{
                        backgroundColor: ['green', 'yellow', 'blue', 'pink'],
                        data,
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
], ShareOverviewPieComponent.prototype, "shareAccounts", void 0);
ShareOverviewPieComponent = __decorate([
    Component({
        selector: 'online-banking-share-overview-pie',
        templateUrl: './share-overview-pie.component.html',
        styleUrls: ['./share-overview-pie.component.css']
    })
], ShareOverviewPieComponent);
export { ShareOverviewPieComponent };
//# sourceMappingURL=share-overview-pie.component.js.map