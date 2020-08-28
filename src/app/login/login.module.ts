import { NgModule } from '@angular/core';

/** Custom Modules */
import { SharedModule } from '../shared/shared.module';
import { LoginRoutingModule } from './login-routing.module';

/** Custom Components */
import { LoginComponent } from './login.component';
import { LoginFormComponent } from './login-form/login-form.component';
import { ResetPasswordComponent } from './reset-password/reset-password.component';
import {FormsModule, ReactiveFormsModule} from '@angular/forms';
import {IconsModule} from '../shared/icons.module';


@NgModule({
  declarations: [LoginComponent, LoginFormComponent, ResetPasswordComponent],
  imports: [
    SharedModule,
    LoginRoutingModule,
    FormsModule,
    ReactiveFormsModule,
    IconsModule
  ],
})
export class LoginModule { }
