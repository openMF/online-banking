import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'online-banking-savings-account-details',
  templateUrl: './savings-account-details.component.html',
  styleUrls: ['./savings-account-details.component.css']
})
export class SavingsAccountDetailsComponent implements OnInit {

  accountDetails: any;

  constructor(private route: ActivatedRoute,
              private router: Router) {
    this.route.data.subscribe((data: { accountDetails: any }) => {
      this.accountDetails = data.accountDetails;
      console.log(this.accountDetails);
    });
  }

  ngOnInit(): void {
  }

}
