/**
 * @file Global page header with the DABubble brand and the register call-to-action.
 */
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterLink } from '@angular/router';

/**
 * Displays the brand logo top-left and a "Neu bei DABubble?" call-to-action
 * with a link to the registration page on the right.
 */
@Component({
  selector: 'app-header',
  imports: [RouterLink],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HeaderComponent {}
