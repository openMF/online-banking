import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';
import { LoginComponent } from './authentication/login/login.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { AuthGuardGuard } from './authorization/auth-guard.guard';
const routes: Routes = [
  {path: '', component : LoginComponent},
  {path: 'dashboard', component : DashboardComponent},
  {path: '**', redirectTo : 'dashboard'}
];
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule]
})
export class AppRoutingModule {}
