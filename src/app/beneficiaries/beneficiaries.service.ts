import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BeneficiariesForm } from './beneficiaries-form/beneficiaries-form.model';

@Injectable({
  providedIn: 'root'
})
export class BeneficiariesService {

  /**
   * @param {HttpClient} http Client for making requests
   */
  constructor(private http: HttpClient) { }

  getBeneficiariesList() {
    return this.http.get('/self/beneficiaries/tpt');
  }

  getAccountTypeOptions() {
    return this.http.get(`/self/beneficiaries/tpt/template`);
  }

  addBeneficiary(beneficiary: BeneficiariesForm) {
    beneficiary.locale = navigator.language;
    return this.http.post('/self/beneficiaries/tpt', beneficiary);
  }

  updateBeneficiary(beneficiary: BeneficiariesForm, beneficiaryId: string) {
    return this.http.put(`/self/beneficiaries/tpt/${beneficiaryId}`, beneficiary);
  }
}
