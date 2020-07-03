import { Component, OnInit } from '@angular/core';
import {AuthenticationService} from '../authentication/authentication.service';
import {Router} from '@angular/router';

@Component({
  selector: 'self-service-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.css']
})
export class ShellComponent implements OnInit {

  constructor(private authenticationService: AuthenticationService,
              private router: Router) { }

  ngOnInit(): void {
  }
}
