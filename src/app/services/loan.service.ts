import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import {HttpClient, HttpHeaders} from '@angular/common/http';
const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json',
'Fineract-Platform-TenantId': 'mobile',
Authorization: 'Basic bWlmb3M6cGFzc3dvcmQ=' })
};

@Injectable({
  providedIn: 'root'
})
export class LoanService {
  loanSummary = [];
  submittedAndPendingApproval = 0;
  approved = 0;
  rejected = 0;
  withdrawnByApplicant = 0;
  active = 0;
  closed = 0;
  prematureClosed = 0;
  transferInProgress = 0;
  transferOnHold = 0;
  matured = 0;
  constructor(private http: HttpClient) { }


}
