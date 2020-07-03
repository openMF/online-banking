/** Angular Imports */
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { HttpClientModule } from '@angular/common/http';

/** Main Component */
import { AppComponent } from './app.component';

/** Not Found Component */
import { NotFoundComponent } from './not-found/not-found.component';

/** Custom Modules */
import { HomeModule } from './home/home.module';
import { LoginModule } from './login/login.module';

/** Main Routing Module */
import { AppRoutingModule } from './app-routing.module';
import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import {ServiceWorkerModule} from '@angular/service-worker';
import {environment} from '../environments/environment';
import {CoreModule} from './core/core.module';

/**
 * App Module
 * All modules should be imported in the order.
 */
@NgModule({
  declarations: [
    AppComponent,
    NotFoundComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ServiceWorkerModule.register('./ngsw-worker.js', { enabled: environment.production }),
    CoreModule,
    LoginModule,
    HomeModule,
    AppRoutingModule
  ],
  providers: [],
  bootstrap: [AppComponent]
})
export class AppModule { }
