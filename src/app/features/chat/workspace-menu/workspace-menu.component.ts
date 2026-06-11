/**
 * @file Workspace column with channels and direct-message lists (dummy data).
 */
import { ChangeDetectionStrategy, Component, computed, inject, signal } from '@angular/core';

import { AuthService } from '../../../services/auth.service';
import { DEFAULT_AVATAR_PATH } from '../../../services/registration.service';
import { DUMMY_CHANNELS, DUMMY_USERS } from '../dummy-data';

const GUEST_NAME = 'Gast';

/**
 * Workspace navigation column showing the Devspace header, the channel list
 * and the direct-message user list. Lists hold dummy data until module 2;
 * the first direct-message entry is the live signed-in user. Selecting an
 * item only updates the visual active state — navigation follows in module 3.
 */
@Component({
  selector: 'app-workspace-menu',
  templateUrl: './workspace-menu.component.html',
  styleUrl: './workspace-menu.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class WorkspaceMenuComponent {
  private readonly authService = inject(AuthService);

  protected readonly channels = DUMMY_CHANNELS;

  protected readonly users = DUMMY_USERS;

  protected readonly channelsOpen = signal(true);

  protected readonly directOpen = signal(true);

  protected readonly selectedId = signal<string | null>(null);

  protected readonly selfName = computed(
    () => `${this.authService.currentUser()?.displayName ?? GUEST_NAME} (Du)`,
  );

  protected readonly selfAvatar = computed(() => this.resolveSelfAvatar());


  /**
   * Resolves the signed-in user's avatar; external URLs fall back to the
   * placeholder because the avatar system is local-path based.
   */
  private resolveSelfAvatar(): string {
    const path = this.authService.currentUser()?.photoURL ?? DEFAULT_AVATAR_PATH;
    return path.startsWith('http') ? `/${DEFAULT_AVATAR_PATH}` : `/${path}`;
  }


  /**
   * Toggles the channels section.
   */
  protected toggleChannels(): void {
    this.channelsOpen.update(open => !open);
  }


  /**
   * Toggles the direct-messages section.
   */
  protected toggleDirect(): void {
    this.directOpen.update(open => !open);
  }


  /**
   * Marks a list item as active. Navigation follows in module 3.
   * @param id List-unique id of the clicked entry.
   */
  protected select(id: string): void {
    this.selectedId.set(id);
  }


  /**
   * Reports whether the given list entry is the active one.
   * @param id List-unique id of the entry.
   */
  protected isSelected(id: string): boolean {
    return this.selectedId() === id;
  }
}
