/**
 * @file Login card with intro splash overlay, rendered inside the auth layout.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { PasswordInputComponent } from '../../../shared/password-input/password-input.component';
import { IntroComponent } from '../intro/intro.component';

/**
 * Visual login screen matching the Figma design. Contains no auth logic or
 * form validation yet — inputs and buttons are presentational only.
 */
@Component({
  selector: 'app-login',
  imports: [RouterLink, IntroComponent, PasswordInputComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {}
