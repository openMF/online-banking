import { __decorate } from "tslib";
/** Angular import */
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
/** Not Found Component */
import { NotFoundComponent } from './not-found/not-found.component';
/**
 * Default fallback in case of undefined prior-route
 */
const routes = [
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
let AppRoutingModule = class AppRoutingModule {
};
AppRoutingModule = __decorate([
    NgModule({
        imports: [RouterModule.forRoot(routes)],
        exports: [RouterModule],
        providers: []
    })
], AppRoutingModule);
export { AppRoutingModule };
//# sourceMappingURL=app-routing.module.js.map