import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/** Root layout for the main app area — contains sidebar, chat panel, and thread panel. */
@Component({
  selector: 'app-shell',
  imports: [RouterOutlet],
  template: `
    <div class="app-shell">
      <router-outlet />
    </div>
  `,
  styles: [`
    .app-shell {
      display: flex;
      width: 100%;
      height: 100%;
    }
  `],
})
export class AppShellComponent {}
