/** Angular Imports */
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

/** Custom Components */
import { LoginComponent } from './login.component';

/** Login Routes */
const routes: Routes = [
  {
    path: 'login',
    component: LoginComponent,
    data: { title: 'login' }
  }
];

/**
 * Login Routing Modules
 *
 * Configures the login routes.
 */
@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
  providers: []
})
export class LoginRoutingModule { }
