import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TransferRequest } from './transferRequest.model';

@Injectable({
  providedIn: 'root'
})
export class TransfersService {

  constructor(private http: HttpClient) { }

  getTransferTemplate() {
   return this.http.get('/self/accounttransfers/template');
  }

  createNewTransfer(body: TransferRequest ) {
   return this.http.post('/self/accounttransfers', body);
  }

}
