/** Angular import */
import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

/** Not Found Component */
import { NotFoundComponent } from './not-found/not-found.component';

/**
 * Default fallback in case of undefined prior-route
 */
const routes: Routes = [
  {
    path: '*',
    component: NotFoundComponent
  }
];

/**
 * App Routing Module
 *
 * Configures the default fallback route.
 */
@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
  providers: []
})
export class AppRoutingModule {
}
