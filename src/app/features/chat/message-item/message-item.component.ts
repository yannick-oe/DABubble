/**
 * @file Single chat message row shared by the chat lists and the thread
 * panel.
 */
import { formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  LOCALE_ID,
  computed,
  inject,
  input,
  output,
} from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';

import { ChatEntry } from '../../../models/message.model';
import { AuthService } from '../../../services/auth.service';
import { DEFAULT_AVATAR_PATH } from '../../../services/registration.service';
import { UserService } from '../../../services/user.service';

const TIME_FORMAT = 'HH:mm';
const UNKNOWN_AUTHOR = 'Unbekannt';

/**
 * One message row per the Figma chat frames: avatar, author meta, bubble
 * and — for threadable chat messages — the reply preview plus a hover
 * action to start a thread. Own messages are mirrored via the host class.
 * Thread replies render identically but without thread affordances.
 */
@Component({
  selector: 'li[app-message-item]',
  templateUrl: './message-item.component.html',
  styleUrl: './message-item.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: {
    class: 'message',
    '[class.message--own]': 'own()',
  },
})
export class MessageItemComponent {
  readonly entry = input.required<ChatEntry>();

  readonly threadable = input(false);

  readonly threadOpen = input(false);

  readonly openThread = output<void>();

  private readonly userService = inject(UserService);

  private readonly authService = inject(AuthService);

  private readonly locale = inject(LOCALE_ID);

  protected readonly own = computed(
    () => this.entry().authorId === this.authService.currentUser()?.uid,
  );

  protected readonly author = computed(() =>
    this.userService.users().find(user => user.uid === this.entry().authorId),
  );

  protected readonly authorName = computed(() => this.author()?.name ?? UNKNOWN_AUTHOR);

  protected readonly authorAvatar = computed(() => this.resolveAvatar());

  protected readonly time = computed(() =>
    formatDate(resolveDate(this.entry().createdAt), TIME_FORMAT, this.locale),
  );

  protected readonly replyCount = computed(() => {
    const entry = this.entry();
    return 'replyCount' in entry ? entry.replyCount : 0;
  });

  protected readonly replyLabel = computed(() =>
    this.replyCount() === 1 ? '1 Antwort' : `${this.replyCount()} Antworten`,
  );

  protected readonly lastReplyTime = computed(() => this.resolveLastReplyTime());


  /**
   * Resolves the author's avatar with the placeholder as fallback.
   */
  private resolveAvatar(): string {
    const path = this.author()?.avatarPath;
    if (!path || path.startsWith('http')) return `/${DEFAULT_AVATAR_PATH}`;
    return `/${path}`;
  }


  /**
   * Formats the latest reply time as HH:mm; empty without replies.
   */
  private resolveLastReplyTime(): string {
    const entry = this.entry();
    if (!('lastReplyAt' in entry) || !entry.lastReplyAt) return '';
    return formatDate(resolveDate(entry.lastReplyAt), TIME_FORMAT, this.locale);
  }
}


/**
 * Converts a Firestore timestamp to a Date; pending serverTimestamp()
 * sentinels (just-sent messages) resolve to now.
 * @param value Timestamp field value from a message document.
 */
function resolveDate(value: ChatEntry['createdAt']): Date {
  return value instanceof Timestamp ? value.toDate() : new Date();
}
