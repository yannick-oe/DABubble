/**
 * @file Hover action bar of a message row: quick reactions, emoji picker
 * trigger, thread toggle and the own-message options menu.
 */
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  input,
  output,
  signal,
  viewChild,
} from '@angular/core';

import { RecentEmojiService } from '../../../services/recent-emoji.service';
import { emojiAsset } from '../emoji-catalog';

type MenuState = 'closed' | 'menu' | 'confirm';

/**
 * Pill-shaped action bar per the Figma frames, shown by the message row on
 * hover and focus. Foreign messages offer the two recent quick emojis, the
 * emoji picker and the thread toggle; own messages additionally get the
 * options menu with edit (within its time window) and the two delete
 * variants behind a confirmation step.
 */
@Component({
  selector: 'app-message-actions',
  templateUrl: './message-actions.component.html',
  styleUrl: './message-actions.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    '[class.actions--open]': "menuState() !== 'closed'",
    '[class.actions--own]': 'own()',
    '(document:click)': 'onDocumentClick($event)',
    '(document:keydown.escape)': 'closeMenu()',
  },
})
export class MessageActionsComponent {
  readonly own = input(false);

  readonly threadable = input(false);

  readonly threadOpen = input(false);

  readonly canEdit = input(false);

  readonly reacted = output<string>();

  readonly pickerRequested = output<void>();

  readonly threadToggled = output<void>();

  readonly editRequested = output<void>();

  readonly deleteForMe = output<void>();

  readonly deleteForAll = output<void>();

  private readonly recentEmojiService = inject(RecentEmojiService);

  private readonly host = inject(ElementRef<HTMLElement>);

  private readonly menuTrigger = viewChild<ElementRef<HTMLButtonElement>>('menuTrigger');

  protected readonly menuState = signal<MenuState>('closed');

  protected readonly quickEmojis = computed(() => this.recentEmojiService.recent());

  protected readonly assetFor = emojiAsset;


  /**
   * Opens or closes the options menu.
   */
  protected toggleMenu(): void {
    this.menuState.update(state => (state === 'closed' ? 'menu' : 'closed'));
  }


  /**
   * Closes the menu and returns focus to its trigger.
   */
  protected closeMenu(): void {
    if (this.menuState() === 'closed') return;
    this.menuState.set('closed');
    this.menuTrigger()?.nativeElement.focus();
  }


  /**
   * Emits a menu action and closes the menu.
   * @param action Output to emit.
   */
  protected emitAndClose(action: 'edit' | 'forMe' | 'forAll'): void {
    if (action === 'edit') this.editRequested.emit();
    if (action === 'forMe') this.deleteForMe.emit();
    if (action === 'forAll') this.deleteForAll.emit();
    this.menuState.set('closed');
  }


  /**
   * Closes the menu when a click lands outside the action bar.
   * @param event Document-level click event.
   */
  protected onDocumentClick(event: Event): void {
    if (this.menuState() === 'closed') return;
    if (!this.host.nativeElement.contains(event.target as Node)) this.menuState.set('closed');
  }
}
