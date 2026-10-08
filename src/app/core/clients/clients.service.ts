import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Page, ClientData, ClientDetails } from './clients.model';

@Injectable({
  providedIn: 'root'
})
export class ClientsService {

  constructor(private http: HttpClient) { }

  /**
   * Fetches the list of clients associated with the currently authenticated self-service user.
   * @returns An Observable of a Page containing ClientData.
   */
  getClients(): Observable<Page<ClientData>> {
    return this.http.get<Page<ClientData>>(`/self/clients`);
  }

  /**
   * Fetches detailed information for a specific client.
   * @param clientId The ID of the client to fetch details for.
   * @returns An Observable containing the ClientDetails.
   */
  getClientDetails(clientId: number): Observable<ClientDetails> {
    return this.http.get<ClientDetails>(`/self/clients/${clientId}`);
  }
}
