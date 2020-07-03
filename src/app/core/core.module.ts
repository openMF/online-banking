import {NgModule, Optional, SkipSelf} from '@angular/core';
import {SharedModule} from '../shared/shared.module';
import {HTTP_INTERCEPTORS, HttpClient, HttpClientModule} from '@angular/common/http';
import {RouteReuseStrategy, RouterModule} from '@angular/router';
import {AuthenticationService} from './authentication/authentication.service';
import {AuthenticationGuard} from './authentication/authentication.guard';
import {AuthenticationInterceptor} from './authentication/authentication.interceptor';
import {HttpCacheService} from './http/http-cache.service';
import {ApiPrefixInterceptor} from './http/api-prefix.interceptor';
import {ErrorHandlerInterceptor} from './http/error-handler.interceptor';
import {CacheInterceptor} from './http/cache.interceptor';
import {HttpService} from './http/http.service';
import {RouteReusableStrategy} from './route/route-reusable-strategy';
import { ShellComponent } from './shell/shell.component';
import { ContentComponent } from './shell/content/content.component';
import { SidenavComponent } from './shell/sidenav/sidenav.component';
import { ToolbarComponent } from './shell/toolbar/toolbar.component';



@NgModule({
  imports: [
    SharedModule,
    HttpClientModule,
    RouterModule
  ],
  exports: [
    SharedModule
  ],
  providers: [
    AuthenticationService,
    AuthenticationGuard,
    AuthenticationInterceptor,
    {
      provide: HTTP_INTERCEPTORS,
      useClass: AuthenticationInterceptor,
      multi: true
    },
    HttpCacheService,
    ApiPrefixInterceptor,
    ErrorHandlerInterceptor,
    CacheInterceptor,
    {
      provide: HttpClient,
      useClass: HttpService
    },
    {
      provide: RouteReuseStrategy,
      useClass: RouteReusableStrategy
    }
  ],
  declarations: [
    ShellComponent,
    ContentComponent,
    SidenavComponent,
    ToolbarComponent]
})
export class CoreModule {
  constructor(@Optional() @SkipSelf() parentModule: CoreModule) {
    if (parentModule) {
      throw new Error(`${parentModule} has already been loaded. Import Core module in the AppModule only.`);
    }
  }
}
