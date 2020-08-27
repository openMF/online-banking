/** Main Component */
import { AppComponent } from './app.component';
/** Custom Modules */
import { HomeModule } from './home/home.module';
import { LoginModule } from './login/login.module';
/** Main Routing Module */
import { AppRoutingModule } from './app-routing.module';
import { CoreModule } from './core/core.module';
import { AccountsModule } from './accounts/accounts.module';
import { BeneficiariesModule } from './beneficiaries/beneficiaries.module';
import { TransfersModule } from './transfers/transfers.module';
/**
 * App Module
 * All modules should be imported in the order.
 */
CoreModule,
    LoginModule,
    HomeModule,
    AccountsModule,
    BeneficiariesModule,
    TransfersModule,
    AppRoutingModule,
;
providers: [],
    bootstrap;
[AppComponent];
export class AppModule {
}
//# sourceMappingURL=app.module.js.map