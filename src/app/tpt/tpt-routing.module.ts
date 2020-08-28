import { Route } from '../core/route/route.service';
import { Routes, RouterModule } from '@angular/router';
import { TptComponent } from './tpt/tpt.component';
import { extract } from '../core/i18n/i18n.service';
import { TptResolver } from './tpt.resolver';
import { NgModule } from '@angular/core';




const routes: Routes = [
    Route.withShell([
        {
            path: 'tpt',
            component: TptComponent,
            data: { title: extract('Third Party Transfers') },
            resolve: { template: TptResolver }
        }
    ])
];

@NgModule({
    imports: [RouterModule.forChild(routes)],
    exports: [RouterModule],
    providers: [TptResolver]
})
export class TptRoutingModule { }
