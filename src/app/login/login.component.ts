/** Angular Imports */
import { Component, OnInit, OnDestroy } from '@angular/core';
import { Router } from '@angular/router';

import { Subscription } from 'rxjs';
import {AlertService} from '../core/alert/alert.service';
import {Alert} from '../core/alert/alert';


@Component({
  selector: 'online-banking-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {
  /** Trues if reset password component is on */
  resetPassword = false;
  /** Subscription to alerts */
  alert$: Subscription;

  /**
   * @param {AlertService} alertService Alert Service
   * @param {Router} router Navigation Router
   */
  constructor( private alertService: AlertService,
               private router: Router) { }

  ngOnInit(): void {
    this.alert$ = this.alertService.alertEvent.subscribe((alertEvent: Alert) => {
      const alertType = alertEvent.type;
      if (alertType === 'Authentication Success') {
        console.log('Authenctication success');
        this.router.navigate(['/home'], {replaceUrl: true});
      } else if (alertType === 'Password Reset Required'){
        this.resetPassword = true;
      }
    });
  }

}
