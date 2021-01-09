import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { ActivatedRoute } from '@angular/router';
import { ToastrService } from 'ngx-toastr';
import { BeneficiariesService } from '../beneficiaries.service';
import { BeneficiariesForm } from './beneficiaries-form.model';
import { Router } from '@angular/router';

@Component({
  selector: 'app-beneficiaries-form',
  templateUrl: './beneficiaries-form.component.html',
  styleUrls: ['./beneficiaries-form.component.scss']
})
export class BeneficiariesFormComponent implements OnInit {

  accountDetails: any;
  accountTypeOptions: any;
  editMode: boolean = false;
  beneficiariesForm: FormGroup;

  constructor(private route: ActivatedRoute,
              private router: Router,
              private formBuilder: FormBuilder,
              private beneficiariesService: BeneficiariesService,
              private toastr: ToastrService) {
    this.route.data.subscribe((data: {accountTypeOptions: any}) => {
      const { accountTypeOptions } = data.accountTypeOptions;
      this.accountTypeOptions = accountTypeOptions;
    });
    if (this.router.getCurrentNavigation().extras.state?.editMode){
      this.accountDetails = this.router.getCurrentNavigation().extras.state;
      this.editMode = true;
    }
  }

  ngOnInit(): void {
    this.createBeneficiaryForm();
  }

  createBeneficiaryForm() {
    const transferLimit = this.accountDetails?.transferLimit;
    this.beneficiariesForm = this.formBuilder.group({
      name: [this.accountDetails?.name, Validators.required],
      officeName: [{value: this.accountDetails?.officeName, disabled: this.editMode}, Validators.required],
      accountNumber: [{value: this.accountDetails?.accountNumber, disabled: this.editMode}, Validators.required],
      accountType: [{value: this.accountDetails?.accountType?.id, disabled: this.editMode}, Validators.required],
      transferLimit: [transferLimit == 0? undefined: transferLimit, Validators.min(1)]
    });
  }

  submitBeneficiaryForm() {
    if(this.editMode) {
      const beneficiary: any = {
        name: this.beneficiariesForm.get('name').value,
        transferLimit: this.beneficiariesForm.get('transferLimit').value
      }
      this.beneficiariesService.updateBeneficiary(beneficiary, this.accountDetails.id).subscribe(res => {
        this.beneficiariesForm.reset();
        Object.keys(this.beneficiariesForm.controls).forEach(key => {
          this.beneficiariesForm.controls[key].setErrors(null);
        });
        this.toastr.success('You will be redirected to beneficiaries section', 'Beneficiary Successfully Updated');
        setTimeout(() => {
          this.router.navigate(['/beneficiaries']);
        }, 2000);
      }, err => {
        if (err.error){
          console.log(err);
          this.toastr.error('Please provide valid account number and office name, beneficiary name should be unique', 'Something went wrong');
        }
      });
    } else {
      const beneficiary: BeneficiariesForm = {
        ...this.beneficiariesForm.value,
      };
      this.beneficiariesService.addBeneficiary(beneficiary).subscribe(res => {
        this.beneficiariesForm.reset();
        Object.keys(this.beneficiariesForm.controls).forEach(key => {
          this.beneficiariesForm.controls[key].setErrors(null);
        });
        this.toastr.success('You will be redirected to beneficiaries section', 'New Beneficiary Successfully added');
        setTimeout(() => {
          this.router.navigate(['/beneficiaries']);
        }, 2000);
      }, err => {
        if (err.error){
          console.log(err);
          this.toastr.error('Please provide valid account number and office name, beneficiary name should be unique', 'Something went wrong');
        }
      });
    }
  }
}
