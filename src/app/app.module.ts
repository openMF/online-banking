import {BrowserAnimationsModule} from '@angular/platform-browser/animations';
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { AppRoutingModule } from './app-routing.module';
import { AppComponent } from './app.component';
import { MaterialModule } from './MaterialModule/material.module';
import { LoginComponent } from './authentication/login/login.component';
import { HttpClientModule } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { AuthorizationService } from './services/authorization.service';
import { SignUpComponent } from './authentication/sign-up/sign-up.component';
import { ForgotPasswordComponent } from './authentication/forgot-password/forgot-password.component';
import { VerificationComponent } from './authentication/verification/verification.component';
import { AppService } from './app.service';
import { DashboardComponent } from './dashboard/dashboard.component';
import { SavingsAccountPieChartComponent } from './dashboard/savings-account-pie-chart/savings-account-pie-chart.component';
import { LoanService } from './services/loan.service';
import { AuthenticationService } from './services/authentication.service';
import { AccountsService } from './services/accounts.service';
import { LoansAccountPieChartComponent } from './dashboard/loans-account-pie-chart/loans-account-pie-chart.component';
import { DoughnutChartComponent, PieChartComponent } from 'angular-d3-charts'; // this is needed!
import { GoogleChartsModule } from 'angular-google-charts';
import { SharesAccountPieChartComponent } from './dashboard/shares-account-pie-chart/shares-account-pie-chart.component';

@NgModule({
  declarations: [
    AppComponent,
    LoginComponent,
    ForgotPasswordComponent,
    SignUpComponent,
    VerificationComponent,
    DashboardComponent,
    SavingsAccountPieChartComponent,
    LoansAccountPieChartComponent,
    SharesAccountPieChartComponent
  ],
  imports: [
    BrowserAnimationsModule,
    MaterialModule,
    BrowserModule,
    AppRoutingModule,
    HttpClientModule,
    FormsModule,
    GoogleChartsModule.forRoot(),
    ],
  providers: [AuthorizationService,
     AppService,
     AuthenticationService,
     LoanService,
     AccountsService],
  bootstrap: [AppComponent],
  entryComponents : [SignUpComponent, VerificationComponent, ForgotPasswordComponent]
})
export class AppModule { }
