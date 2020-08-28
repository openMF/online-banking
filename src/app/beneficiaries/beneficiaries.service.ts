import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

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

}
