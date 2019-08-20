import { Injectable } from '@angular/core';
import { ActivatedRouteSnapshot, RouterStateSnapshot, UrlTree, CanActivate, Router } from '@angular/router';
import { Observable } from 'rxjs';
import { AuthenticationService } from '../services/authentication.service';

@Injectable({
  providedIn: 'root'
})
export class AuthGuardGuard implements CanActivate {

  constructor(private authenticationService: AuthenticationService) {
  }
  // Overrided method of the interface CanActivate which returns true if user is
  // authenticated and vice versa. Its used for Authorization of routes
  canActivate(next: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> | Promise<boolean> | boolean {
    if (localStorage.getItem('userStatus') === 'true') {
      return true;
    } else {
      return false;
    }
  }

}
