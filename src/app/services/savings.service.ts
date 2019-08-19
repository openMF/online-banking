import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { HttpClient, HttpHeaders } from '@angular/common/http';
const httpOptions = {
  headers: new HttpHeaders({ 'Content-Type': 'application/json',
'Fineract-Platform-TenantId': 'mobile',
Authorization: 'Basic bWlmb3M6cGFzc3dvcmQ=' })
};

@Injectable({
  providedIn: 'root'
})
export class SavingsService {

  constructor(private http: HttpClient) { }
}
