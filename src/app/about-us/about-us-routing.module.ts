import { Routes, RouterModule } from '@angular/router';
import { Route } from '../core/route/route.service';
import { AboutUsComponent } from './about-us/about-us.component';
import { extract } from '../core/i18n/i18n.service';
import { NgModule } from '@angular/core';



const routes: Routes = [
    Route.withShell([
        {
            path: 'about-us',
            component: AboutUsComponent,
            data: { title: extract('About Us') }
        },
    ])
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule]
})
export class AboutUsRoutingModule { }
