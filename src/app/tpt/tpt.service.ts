import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root'
})
export class TptService {

  /**
   * @param {HttpClient} http Client for making requests
   */
  constructor(private http: HttpClient) { }

  getTPTTemplate() {
    return this.http.get(`/self/accounttransfers/template?type=tpt`);
  }

}
