/**
 * @file Shared scrollable message list with date separators, used by the
 * channel chat and direct-message views.
 */
import { formatDate } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  LOCALE_ID,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { Timestamp } from '@angular/fire/firestore';

import { Message } from '../../../models/message.model';
import { AuthService } from '../../../services/auth.service';
import { DEFAULT_AVATAR_PATH } from '../../../services/registration.service';
import { UserService } from '../../../services/user.service';

const TODAY_LABEL = 'Heute';
const DATE_KEY_FORMAT = 'yyyy-MM-dd';
const DAY_LABEL_FORMAT = 'EEEE, d. MMMM';
const TIME_FORMAT = 'HH:mm';
const UNKNOWN_AUTHOR = 'Unbekannt';
const NEAR_BOTTOM_THRESHOLD_PX = 120;

/** Consecutive messages of one calendar day under a shared separator. */
interface MessageGroup {
  readonly key: string;
  readonly label: string;
  readonly messages: Message[];
}

/**
 * Scrollable message list per Figma frames 06/09: German date separators,
 * own messages mirrored right, foreign messages left with live-resolved
 * author identity, and thread previews. Auto-scrolls to new messages
 * unless the user scrolled up to read history; switching the context
 * (resetKey) re-enables sticking to the bottom.
 */
@Component({
  selector: 'app-message-list',
  templateUrl: './message-list.component.html',
  styleUrl: './message-list.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MessageListComponent {
  readonly messages = input.required<Message[]>();

  readonly resetKey = input.required<string>();

  private readonly userService = inject(UserService);

  private readonly authService = inject(AuthService);

  private readonly locale = inject(LOCALE_ID);

  private readonly scrollContainer = viewChild<ElementRef<HTMLElement>>('scrollContainer');

  private stickToBottom = true;

  private renderedResetKey: string | null = null;

  protected readonly groups = computed(() => this.groupMessages());

  private readonly usersById = computed(
    () => new Map(this.userService.users().map(user => [user.uid, user])),
  );


  /**
   * Reacts to context switches (scroll reset) and to message changes
   * (conditional auto-scroll).
   */
  constructor() {
    effect(() => this.handleContextSwitch(this.resetKey()));
    effect(() => this.handleMessagesRendered(this.groups()));
  }


  /**
   * Tracks whether the user is near the bottom; only then new messages may
   * auto-scroll the list.
   */
  protected onScroll(): void {
    const element = this.scrollContainer()?.nativeElement;
    if (!element) return;
    const distance = element.scrollHeight - element.scrollTop - element.clientHeight;
    this.stickToBottom = distance < NEAR_BOTTOM_THRESHOLD_PX;
  }


  /**
   * Reports whether the message was written by the signed-in user.
   * @param message Message from the live stream.
   */
  protected isOwn(message: Message): boolean {
    return message.authorId === this.authService.currentUser()?.uid;
  }


  /**
   * Resolves the author's display name live via the user stream.
   * @param message Message from the live stream.
   */
  protected authorName(message: Message): string {
    return this.usersById().get(message.authorId)?.name ?? UNKNOWN_AUTHOR;
  }


  /**
   * Resolves the author's avatar with the placeholder as fallback.
   * @param message Message from the live stream.
   */
  protected authorAvatar(message: Message): string {
    const path = this.usersById().get(message.authorId)?.avatarPath;
    if (!path || path.startsWith('http')) return `/${DEFAULT_AVATAR_PATH}`;
    return `/${path}`;
  }


  /**
   * Formats a message's creation time as HH:mm.
   * @param message Message from the live stream.
   */
  protected messageTime(message: Message): string {
    return formatDate(resolveDate(message.createdAt), TIME_FORMAT, this.locale);
  }


  /**
   * Formats the latest reply time as HH:mm; empty without replies.
   * @param message Message from the live stream.
   */
  protected lastReplyTime(message: Message): string {
    if (!message.lastReplyAt) return '';
    return formatDate(resolveDate(message.lastReplyAt), TIME_FORMAT, this.locale);
  }


  /**
   * Builds the singular/plural reply-count label for the thread preview.
   * @param message Message from the live stream.
   */
  protected replyLabel(message: Message): string {
    return message.replyCount === 1 ? '1 Antwort' : `${message.replyCount} Antworten`;
  }


  /**
   * Re-enables sticking to the bottom when the chat context changes.
   * @param resetKey Channel or conversation key of the current context.
   */
  private handleContextSwitch(resetKey: string): void {
    if (resetKey === this.renderedResetKey) return;
    this.renderedResetKey = resetKey;
    this.stickToBottom = true;
  }


  /**
   * Scrolls to the newest message after rendering while the user is near
   * the bottom; reading history is never interrupted.
   * @param groups Rendered message groups (effect dependency).
   */
  private handleMessagesRendered(groups: MessageGroup[]): void {
    if (groups.length === 0 || !this.stickToBottom) return;
    requestAnimationFrame(() => {
      const element = this.scrollContainer()?.nativeElement;
      if (element) element.scrollTop = element.scrollHeight;
    });
  }


  /**
   * Groups the ordered messages by calendar day for the date separators.
   */
  private groupMessages(): MessageGroup[] {
    const groups: MessageGroup[] = [];
    for (const message of this.messages()) {
      const date = resolveDate(message.createdAt);
      const key = formatDate(date, DATE_KEY_FORMAT, this.locale);
      const current = groups[groups.length - 1];
      if (current?.key === key) current.messages.push(message);
      else groups.push({ key, label: this.dayLabel(date), messages: [message] });
    }
    return groups;
  }


  /**
   * Builds the separator label: "Heute" for today, otherwise the German
   * long form like "Dienstag, 14. Januar".
   * @param date Calendar day of the group.
   */
  private dayLabel(date: Date): string {
    const dayKey = formatDate(date, DATE_KEY_FORMAT, this.locale);
    const todayKey = formatDate(new Date(), DATE_KEY_FORMAT, this.locale);
    return dayKey === todayKey ? TODAY_LABEL : formatDate(date, DAY_LABEL_FORMAT, this.locale);
  }
}


/**
 * Converts a Firestore timestamp to a Date; pending serverTimestamp()
 * sentinels (just-sent messages) resolve to now.
 * @param value Timestamp field value from a message document.
 */
function resolveDate(value: Message['createdAt']): Date {
  return value instanceof Timestamp ? value.toDate() : new Date();
}
