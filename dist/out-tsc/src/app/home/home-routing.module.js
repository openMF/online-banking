import { __decorate } from "tslib";
import { NgModule } from '@angular/core';
import { RouterModule } from '@angular/router';
import { Route } from '../core/route/route.service';
import { HomeComponent } from './home.component';
import { extract } from '../core/i18n/i18n.service';
import { HomeResolver } from './home.resolver';
const routes = [
    Route.withShell([{
            path: '',
            redirectTo: '/home',
            pathMatch: 'full'
        },
        {
            path: 'home',
            component: HomeComponent,
            data: { title: extract('Home') },
            resolve: { accounts: HomeResolver }
        }
    ])
];
let HomeRoutingModule = class HomeRoutingModule {
};
HomeRoutingModule = __decorate([
    NgModule({
        imports: [RouterModule.forChild(routes)],
        exports: [RouterModule],
        providers: [HomeResolver]
    })
], HomeRoutingModule);
export { HomeRoutingModule };
//# sourceMappingURL=home-routing.module.js.map