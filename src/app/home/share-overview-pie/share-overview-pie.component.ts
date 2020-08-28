import {Component, Input, OnInit} from '@angular/core';
import Chart from 'chart.js';

@Component({
  selector: 'online-banking-share-overview-pie',
  templateUrl: './share-overview-pie.component.html',
  styleUrls: ['./share-overview-pie.component.css']
})
export class ShareOverviewPieComponent implements OnInit {
  /** The chart to render */
  chart: any;
  /** List of accounts as input */
  @Input() shareAccounts: any;
  constructor() { }

  ngOnInit(): void {
    console.log(this.shareAccounts);
    const labels = [];
    const data = [];
    this.shareAccounts.forEach((account) => {
      if (account.status.value in labels){
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

}
