/** Angular Imports */
import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormsModule } from '@angular/forms';

/** Custom Modules */
import { IconsModule } from './icons.module';
import {MaterialModule} from './material.module';

/**
 * Shared Modules
 *
 * Modules and Components shared throughout the Application
 */
@NgModule({
  imports: [
    CommonModule,
    IconsModule,
    MaterialModule,
    ReactiveFormsModule
  ],
  declarations: [],
  exports: [
    CommonModule,
    IconsModule,
    MaterialModule,
    FormsModule,
    ReactiveFormsModule
  ]
})
export class SharedModule { }
