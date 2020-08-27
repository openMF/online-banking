import {Component, Input, OnInit} from '@angular/core';
import Chart from 'chart.js';

@Component({
  selector: 'online-banking-savings-overview-pie',
  templateUrl: './savings-overview-pie.component.html',
  styleUrls: ['./savings-overview-pie.component.css']
})
export class SavingsOverviewPieComponent implements OnInit {
  chart: any;
  @Input() savingsAccounts: any;
  constructor() { }

  ngOnInit(): void {
    const labels = [];
    const data = [];
    this.savingsAccounts.forEach((account) => {
      if (labels.indexOf(account.status.value) !== -1){
        data[labels.indexOf(account.status.value)] += 1;
      }
      else {
        data.push(1);
        labels.push(account.status.value);
      }
    });

    console.log('labels', labels);
    console.log('data', data);

    this.chart = new Chart('savings-pie', {
      type: 'pie',
      data: {
        labels,
        datasets: [{
        backgroundColor: ['red', 'green', 'yellow', 'blue', 'pink', 'red', 'green', 'yellow', 'blue', 'pink', 'red', 'green', 'yellow', 'blue', 'pink'],
          data
        }]
      },
      options: {
        layout: {
          padding: {
            top: 10,
            bottom: 15
          }
        },
      }
    });
  }

}
