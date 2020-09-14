import {Component, Input, OnInit} from '@angular/core';
import {Router} from '@angular/router';
import {AuthenticationService} from '../../authentication/authentication.service';

@Component({
  selector: 'online-banking-sidenav',
  templateUrl: './sidenav.component.html',
  styleUrls: ['./sidenav.component.scss']
})
export class SidenavComponent implements OnInit {
  /** True if sidenav is in collapsed state. */
  @Input() sidenavCollapsed: boolean;
  /** Username of authenticated user. */
  username: string;
  displayImage: string;

  /**
   * @param {Router} router Router for navigation.
   * @param {AuthenticationService} authenticationService Authentication Service.
   */
  constructor(private router: Router,
              private authenticationService: AuthenticationService
              ) { }

  /**
   * Sets the username of the authenticated user.
   */
  ngOnInit() {
    const credentials = this.authenticationService.getCredentials();
    this.username = credentials.username;
  }

  // TODO: Implement this method for displaying the profile picture
  // setDisplayImage() {
  //   this.sidenavService.getClientImage().subscribe((displayImage) => {
  //     this.displayImage = displayImage.toString();
  //   })
  // }

  /**
   * Logs out the authenticated user and redirects to login page.
   */
  logout() {
    this.authenticationService.logout()
      .subscribe(() => this.router.navigate(['/login'], { replaceUrl: true }));
  }



}
