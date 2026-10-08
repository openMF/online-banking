import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { Route } from '../core/route/route.service';
import { extract } from '../core/i18n/i18n.service';
import { ProfileComponent } from './profile.component';

const routes: Routes = [
  Route.withShell([
    {
      path: '',
      component: ProfileComponent,
      data: { title: extract('My Profile') }
    }
  ])
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule]
})
export class ProfileRoutingModule { }
