/**
 * @file App topbar with brand, static search field, the signed-in user
 * and the profile menu.
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';

import { AuthService } from '../../../services/auth.service';
import { DEFAULT_AVATAR_PATH } from '../../../services/registration.service';
import { UserService } from '../../../services/user.service';
import { ProfileDialogComponent } from '../../profile/profile-dialog/profile-dialog.component';
import {
  DialogAnchor,
  DialogShellComponent,
  anchorBelow,
} from '../../../shared/dialog-shell/dialog-shell.component';

const GUEST_NAME = 'Gast';

type TopbarState = 'closed' | 'menu' | 'profile';

/**
 * Top bar of the app shell. Shows the brand, a static search input (search
 * logic follows in a later module) and the signed-in user's live identity
 * resolved from the users collection. The profile area opens the anchored
 * profile menu with the profile dialog and the logout action.
 */
@Component({
  selector: 'app-topbar',
  imports: [DialogShellComponent, ProfileDialogComponent],
  templateUrl: './topbar.component.html',
  styleUrl: './topbar.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TopbarComponent {
  private readonly authService = inject(AuthService);

  private readonly userService = inject(UserService);

  private readonly router = inject(Router);

  protected readonly state = signal<TopbarState>('closed');

  protected readonly menuAnchor = signal<DialogAnchor | null>(null);

  protected readonly selfUid = computed(() => this.authService.currentUser()?.uid ?? null);

  private readonly userDoc = computed(() =>
    this.userService.users().find(user => user.uid === this.selfUid()),
  );

  protected readonly userName = computed(
    () =>
      this.userDoc()?.name ??
      this.authService.currentUser()?.displayName ??
      GUEST_NAME,
  );

  protected readonly avatarSrc = computed(() => this.resolveAvatar());

  protected readonly avatarAlt = computed(() => `Avatar von ${this.userName()}`);


  /**
   * Opens the profile menu anchored below the trigger, right-aligned.
   * @param event Click event of the profile trigger.
   */
  protected openMenu(event: Event): void {
    const trigger = event.currentTarget;
    if (!(trigger instanceof HTMLElement)) return;
    this.menuAnchor.set(anchorBelow(trigger, 'right'));
    this.state.set('menu');
  }


  /**
   * Closes any open menu or dialog.
   */
  protected close(): void {
    this.state.set('closed');
  }


  /**
   * Switches from the menu to the own-profile dialog.
   */
  protected openProfile(): void {
    this.state.set('profile');
  }


  /**
   * Signs out and returns to the login page.
   */
  protected async logout(): Promise<void> {
    this.state.set('closed');
    await this.authService.logout();
    this.router.navigate(['/auth/login']);
  }


  /**
   * Resolves the avatar from the live user document; the auth profile is
   * only a fallback while the document is loading.
   */
  private resolveAvatar(): string {
    const path = this.userDoc()?.avatarPath ?? this.authService.currentUser()?.photoURL;
    if (!path || path.startsWith('http')) return `/${DEFAULT_AVATAR_PATH}`;
    return `/${path}`;
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
}
