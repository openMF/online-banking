import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Component, OnInit, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { LoanService } from '../loan.service';
import { principalValidator } from './validators';
import { LoanRequest } from '../loanRequest.model';

const dateOptions = {day: '2-digit', month: 'short', year: 'numeric'};

@Component({
  selector: 'app-apply-loan',
  templateUrl: './apply-loan.component.html',
  styleUrls: ['./apply-loan.component.scss']
})
export class ApplyLoanComponent implements OnInit {
  @ViewChild('loanApplyForm') formRef;

  productOptions: any;
  loanProductDetails: any;
  applyLoanForm: FormGroup;
  loanProductLoaded = false;
  date = (new Date()).toLocaleDateString('en-GB', dateOptions);

  constructor(private route: ActivatedRoute,
              private formBuilder: FormBuilder,
              private loanService: LoanService,
              private toastr: ToastrService) {
      this.route.data.subscribe((data: {productOptions: any}) => {
        const { productOptions } = data.productOptions;
        this.productOptions = productOptions;
      });
    }

    ngOnInit(): void {
      this.createApplyLoanForm();
    }

    createApplyLoanForm() {
      this.applyLoanForm = this.formBuilder.group({
        submittedOnDate: [this.date],
        productId: ['', Validators.required],
        expectedDisbursementDate: [this.date],
        principal: ['', [Validators.required]],
        currency: [{value: '', disabled: true}, Validators.required],
        loanPurposeId: [{value: '', disabled: true}, Validators.required],
      });
    }

  getPrincipal(){
    return this.applyLoanForm.get('principal');
  }

  loanProductValid(loanProduct): boolean{
    const product = loanProduct.product;
    console.log(product);
    const neededKeys = ['maxNumberOfRepayments', 'minPrincipal', 'maxPrincipal', 'repaymentEvery',
      'repaymentFrequencyType', 'maxNumberOfRepayments', 'minInterestRatePerPeriod', 'amortizationType',
      'interestType', 'transactionProcessingStrategyId', 'interestCalculationPeriodType'];
    return neededKeys.every(key => Object.keys(product).includes(key));
  }

  loanProductSelected(selection: any){
    console.log(selection.value);
    this.loanProductLoaded = false;
    this.loanProductDetails = null;
    const productId = selection.value;
    this.loanService.getProductOptionDetails(productId).subscribe(data => {
      this.loanProductDetails = data;
      this.applyLoanForm.patchValue({
        currency: this.loanProductDetails.currency.code
      });
      if (this.loanProductValid(this.loanProductDetails)){
        this.loanProductLoaded = true;
        this.applyLoanForm.get('loanPurposeId').enable();
        const { minPrincipal, maxPrincipal} = this.loanProductDetails.product;
        this.getPrincipal().setValidators([
          Validators.required,
          principalValidator({lower: minPrincipal, upper: maxPrincipal})
        ]);
      } else {
        this.loanProductLoaded = false;
        this.applyLoanForm.get('loanPurposeId').disable();
        this.toastr.error('Could not load this Loan product, please try a different product', 'Something went wrong');
      }
    });
  }

  newLoanRequest(){
    const { product: loanProduct } = this.loanProductDetails;
    const loan: LoanRequest = {
      locale: 'en_GB',
      loanType: 'individual',
      dateFormat: 'dd MMMM yyyy',
      ...this.applyLoanForm.value,
      interestType: loanProduct.interestType.id,
      repaymentEvery: loanProduct.repaymentEvery,
      amortizationType: loanProduct.amortizationType.id,
      numberOfRepayments: loanProduct.maxNumberOfRepayments,
      interestRatePerPeriod: loanProduct.minInterestRatePerPeriod,
      loanTermFrequencyType: loanProduct.repaymentFrequencyType.id,
      repaymentFrequencyType: loanProduct.repaymentFrequencyType.id,
      interestCalculationPeriodType: loanProduct.interestCalculationPeriodType.id,
      transactionProcessingStrategyId: loanProduct.transactionProcessingStrategyId,
      loanTermFrequency: loanProduct.maxNumberOfRepayments * loanProduct.repaymentEvery,
    };
    console.log(loan);
    this.loanService.requestNewLoan(loan).subscribe(res => {
      console.log(res);
      this.applyLoanForm.reset();
      Object.keys(this.applyLoanForm.controls).forEach(key => {
        this.applyLoanForm.controls[key].setErrors(null);
      });
      this.toastr.success('Find it under loan accounts in acconts tab', 'Loan Application Successful');
    }, err => {
      if (err.error){
        this.toastr.error('Please try a different loan product', 'Something went wrong');
      }
    });
  }
}
