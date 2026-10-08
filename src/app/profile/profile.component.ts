import { Component, OnInit } from '@angular/core';
import { ClientsService } from '../core/clients/clients.service';
import { ClientData, ClientDetails } from '../core/clients/clients.model';

@Component({
  selector: 'online-banking-profile',
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.css']
})
export class ProfileComponent implements OnInit {

  clientDetails: ClientDetails | null = null;
  loading: boolean = true;
  error: string | null = null;

  constructor(private clientsService: ClientsService) { }

  ngOnInit(): void {
    this.fetchProfileData();
  }

  /**
   * Fetches the user's primary client ID and then fetches their full profile details.
   */
  private fetchProfileData(): void {
    this.loading = true;
    this.error = null;

    this.clientsService.getClients().subscribe(
      (response) => {
        if (response && response.pageItems && response.pageItems.length > 0) {
          // Typically the first client is the primary one for the self-service user
          const primaryClientId = response.pageItems[0].id;
          this.loadClientDetails(primaryClientId);
        } else {
          this.error = 'No client profile found for this user.';
          this.loading = false;
        }
      },
      (err) => {
        console.error('Error fetching clients', err);
        this.error = 'Failed to load profile. Please try again later.';
        this.loading = false;
      }
    );
  }

  /**
   * Loads the full details for a specific client ID.
   * @param clientId The ID of the client.
   */
  private loadClientDetails(clientId: number): void {
    this.clientsService.getClientDetails(clientId).subscribe(
      (details) => {
        this.clientDetails = details;
        this.loading = false;
      },
      (err) => {
        console.error('Error fetching client details', err);
        this.error = 'Failed to load detailed profile information.';
        this.loading = false;
      }
    );
  }
}
