/**
 * @file Login page composed of intro splash, brand header, auth card and footer.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

import { FooterComponent } from '../../../shared/footer/footer.component';
import { HeaderComponent } from '../../../shared/header/header.component';
import { IntroComponent } from '../intro/intro.component';

/**
 * Visual login screen matching the Figma design. Contains no auth logic or
 * form validation yet — inputs and buttons are presentational only.
 */
@Component({
  selector: 'app-login',
  imports: [RouterLink, HeaderComponent, FooterComponent, IntroComponent],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class LoginComponent {}
