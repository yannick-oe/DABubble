/**
 * @file Signed-in placeholder for the app area.
 * TODO: replaced by the main chat layout in the next module.
 */
import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../services/auth.service';
import { DEFAULT_AVATAR_PATH } from '../../../services/registration.service';

const GUEST_NAME = 'Gast';

/**
 * Minimal authenticated landing page showing the signed-in identity and a
 * logout action.
 */
@Component({
  selector: 'app-shell',
  templateUrl: './app-shell.component.html',
  styleUrl: './app-shell.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class AppShellComponent {
  private readonly authService = inject(AuthService);

  private readonly router = inject(Router);

  protected readonly userName = computed(
    () => this.authService.currentUser()?.displayName ?? GUEST_NAME,
  );

  protected readonly avatarSrc = computed(() => this.resolveAvatar());

  protected readonly avatarAlt = computed(() => `Avatar von ${this.userName()}`);


  /**
   * Resolves the avatar image source from the auth profile. The avatar
   * system is local-path based: external URLs (e.g. Google profile photos)
   * are replaced by the placeholder.
   */
  private resolveAvatar(): string {
    const path = this.authService.currentUser()?.photoURL ?? DEFAULT_AVATAR_PATH;
    return path.startsWith('http') ? `/${DEFAULT_AVATAR_PATH}` : `/${path}`;
  }


  /**
   * Swaps the avatar to the placeholder when the image fails to load.
   * @param event Error event of the avatar image element.
   */
  protected useAvatarFallback(event: Event): void {
    const image = event.target as HTMLImageElement;
    if (image.src.endsWith(DEFAULT_AVATAR_PATH)) return;
    image.src = `/${DEFAULT_AVATAR_PATH}`;
  }


  /**
   * Signs out and returns to the login page.
   */
  protected async logout(): Promise<void> {
    await this.authService.logout();
    this.router.navigate(['/auth/login']);
  }
}
