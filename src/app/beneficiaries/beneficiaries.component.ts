import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';

@Component({
  selector: 'online-banking-beneficiaries',
  templateUrl: './beneficiaries.component.html',
  styleUrls: ['./beneficiaries.component.css']
})
export class BeneficiariesComponent implements OnInit {

  beneficiaries: any;

  constructor(private route: ActivatedRoute,
              private router: Router) {
      this.route.data.subscribe((data: {beneficiaries: any}) => {
        this.beneficiaries = data.beneficiaries;
      });
    }

  ngOnInit(): void {
  }

}
