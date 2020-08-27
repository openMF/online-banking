import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { Route } from '../core/route/route.service';

import { HomeComponent } from './home.component';
import {extract} from '../core/i18n/i18n.service';
import { HomeResolver } from './home.resolver';

const routes: Routes = [
  Route.withShell([{
    path: '',
    redirectTo: '/home',
    pathMatch: 'full'
  },
  {
     path: 'home',
     component: HomeComponent,
     data: {title: extract('Home')},
      resolve: { accounts: HomeResolver }}
     ])
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: [ HomeResolver ]
})
export class HomeRoutingModule { }

