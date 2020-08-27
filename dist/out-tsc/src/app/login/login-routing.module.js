import { __decorate } from "tslib";
/** Angular Imports */
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
/** Custom Components */
import { LoginComponent } from './login.component';
/** Login Routes */
const routes = [
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
let LoginRoutingModule = class LoginRoutingModule {
};
LoginRoutingModule = __decorate([
    NgModule({
        imports: [RouterModule.forChild(routes)],
        exports: [RouterModule],
        providers: []
    })
], LoginRoutingModule);
export { LoginRoutingModule };
//# sourceMappingURL=login-routing.module.js.map