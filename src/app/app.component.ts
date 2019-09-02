import { Component, OnInit, ViewChild, DoCheck } from '@angular/core';
import { ChangeDetectorRef, OnDestroy } from '@angular/core';
import { MediaMatcher } from '@angular/cdk/layout';
import { Router, RouterEvent } from '@angular/router';
import { AppService } from './app.service';
import { HostListener } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';

import {
  NavigationStart,
  NavigationEnd,
  NavigationCancel,
  NavigationError
} from '@angular/router';
import { NgxSpinnerService } from 'ngx-spinner';
import { ClientService } from './services/client.service';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy, DoCheck {
  public showOverlay = true;
  menuIconShow = false;
  toggle = false;
  toggleMobileScreen = false;
  @ViewChild('snav') snav: any;
  innerWidth: number;
  clientImage: string;
  // Initialise all the instance variables
  constructor(
    changeDetectorRef: ChangeDetectorRef, media: MediaMatcher,
    private router: Router,
    private appService: AppService,
    private spinner: NgxSpinnerService,
    private clientService: ClientService,
    public domSanitizationService: DomSanitizer) {
    router.events.subscribe((event: RouterEvent) => {
      this.navigationInterceptor(event);
    });
    this.mobileQuery = media.matchMedia('(max-width: 600px)');
    this.mobileQueryListener = () => changeDetectorRef.detectChanges();
    this.mobileQuery.addListener(this.mobileQueryListener);
    this.appService.configObservable.subscribe(userStatus => {
      this.show = userStatus;
    });
  }
  private readonly mobileQueryListener: () => void;
  show = false;
  sidenavContents: any = [
    {
      title: 'Dashboard',
      icon: 'dashboard',
      link: 'dashboard'
    },
  ];
  title = 'Online-Banking-App-3.0';
  mobileQuery: MediaQueryList;
  username = '';
  displayPictureFetched = false;
  // Check if the user is already authenticated, navigate to the dashboard else navigate to login
  ngOnInit() {
    if (localStorage.getItem('userStatus')) {
      if (localStorage.getItem('userStatus') === 'true') {
        this.router.navigate(['/dashboard']).then(
          this.snav.open()
        );
      }
    } else {
      this.snav.close();
      this.router.navigate(['/']).then();
    }
    this.onResize();
    this.appService.spinnerObservable.subscribe((status) => {
      if (status) {
        this.spinner.show();
      } else {
        this.spinner.hide();
      }
    });
  }
  // Shows and hides the loading spinner during RouterEvent changes
  navigationInterceptor(event: RouterEvent): void {
    if (event instanceof NavigationStart) {
      this.showOverlay = true;
    }
    if (event instanceof NavigationEnd) {
      this.showOverlay = false;
    }

    // Set loading state to false in both of the below events to hide the spinner in case a request fails
    if (event instanceof NavigationCancel) {
      this.showOverlay = false;
    }
    if (event instanceof NavigationError) {
      this.showOverlay = false;
    }
  }
  @HostListener('window:resize', ['$event'])
  onResize() {
    this.innerWidth = window.innerWidth;
  }
  // Toggle the sidenav bar for desktop and mobile screens respectively
  toggleForMobileScreens() {
    if (this.innerWidth < 600 && localStorage.getItem('userStatus') === 'true') {
      if (this.toggleForMobileScreens) {
        this.toggleMobileScreen = false;
        this.snav.close();
      } else {
        this.toggleMobileScreen = true;
        this.snav.open();
      }
    }
  }
  // Manipulate the behaviour of the toolbar and the sidenav bar based on screen width.
  ngDoCheck() {
    if (localStorage.getItem('userStatus') === 'true') {
      if (!this.displayPictureFetched) {
        this.clientService.getClient(localStorage.getItem('id'))
          .subscribe((data: any) => {
            this.displayPictureFetched = true;
            this.username = data.displayName;
          });
      }
      this.show = true;
      if (this.innerWidth > 600) {
        this.menuIconShow = false;
        this.snav.open();
      } else {
        this.menuIconShow = true;
      }
    } else {
      this.show = false;
      this.snav.close();
    }
  }
  ngOnDestroy(): void {
    this.mobileQuery.removeListener(this.mobileQueryListener);
  }
  // Method for toggling the sidenav bar when in mobile screen
  toggleSideNav() {
    if (this.toggle) {
      this.toggle = false;
      this.snav.close();
    } else {
      this.toggle = true;
      this.snav.open();
    }
  }
  // logs the user out and set the neccessary variables in cache
  logout() {
    localStorage.setItem('userStatus', 'false');
    localStorage.setItem('token', '');
    this.snav.close();
    this.router.navigate(['/']).then();
  }
}
