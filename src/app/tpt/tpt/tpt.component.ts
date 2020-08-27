import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';

@Component({
  selector: 'online-banking-tpt',
  templateUrl: './tpt.component.html',
  styleUrls: ['./tpt.component.scss']
})
export class TptComponent implements OnInit {

  fromAccountOptions: any;
  toAccountOptions: any;
  displayedFromAccountOptions: any;
  displayedToAccountOptions: any;
  transferForm: FormGroup;
  date = new Date();


  constructor(private route: ActivatedRoute,
              private formBuilder: FormBuilder) {
    this.route.data.subscribe((data: {template: any}) => {
      const {fromAccountOptions, toAccountOptions} = data.template;
      this.fromAccountOptions = fromAccountOptions;
      this.displayedFromAccountOptions = fromAccountOptions;
      this.toAccountOptions = toAccountOptions;
      this.displayedToAccountOptions = toAccountOptions;
    });
   }

  ngOnInit(): void {
    this.createTransferForm();
  }

  createTransferForm() {
    this.transferForm = this.formBuilder.group({
      toAccount: ['', Validators.required],
      fromAccount: ['', Validators.required],
      amount: ['', Validators.required],
      date: this.date,
      remarks: ['', Validators.required]
    });
  }

  handleFromFieldOption(value: any) {
    this.displayedToAccountOptions = this.toAccountOptions.filter(account => value ? account.accountId !== value.accountId : true);
  }

  handleToFieldOption(value: any) {
    this.displayedFromAccountOptions = this.fromAccountOptions.filter( account => value ? account.accountId !== value.accountId : true);
  }

  submitTransferRequest() {
    console.log('trying to submit the transfer request', this.transferForm.value);
  }
}
