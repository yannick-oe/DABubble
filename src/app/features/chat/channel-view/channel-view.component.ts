/**
 * @file Channel chat view: header, shared message list and composer.
 */
import {
  ChangeDetectionStrategy,
  Component,
  computed,
  effect,
  inject,
  input,
  viewChild,
} from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import { switchMap } from 'rxjs';

import { Channel } from '../../../models/channel.model';
import { Message } from '../../../models/message.model';
import { UserDoc } from '../../../models/user.model';
import { ChannelService } from '../../../services/channel.service';
import { MessageService, channelMessagesPath } from '../../../services/message.service';
import { DEFAULT_AVATAR_PATH } from '../../../services/registration.service';
import { ThreadService } from '../../../services/thread.service';
import { ToastService } from '../../../services/toast.service';
import { UserService } from '../../../services/user.service';
import { MessageInputComponent } from '../message-input/message-input.component';
import { MessageListComponent } from '../message-list/message-list.component';

const SEND_ERROR = 'Die Nachricht konnte nicht gesendet werden.';
const HEAD_AVATAR_LIMIT = 3;

/**
 * Chat view of a channel per Figma frames 06/09: header with name and
 * member cluster, the shared live message list and the composer, which is
 * focused automatically on every channel switch.
 */
@Component({
  selector: 'app-channel-view',
  imports: [MessageInputComponent, MessageListComponent],
  templateUrl: './channel-view.component.html',
  styleUrl: './channel-view.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ChannelViewComponent {
  readonly channelId = input.required<string>();

  private readonly channelService = inject(ChannelService);

  private readonly messageService = inject(MessageService);

  private readonly userService = inject(UserService);

  private readonly toastService = inject(ToastService);

  private readonly threadService = inject(ThreadService);

  private readonly composer = viewChild(MessageInputComponent);

  private focusedChannelId: string | null = null;

  protected readonly messages = toSignal(
    toObservable(this.channelId).pipe(
      switchMap(id => this.messageService.streamMessages(channelMessagesPath(id))),
    ),
    { initialValue: [] as Message[] },
  );

  protected readonly channel = computed<Channel | undefined>(() =>
    this.channelService.channels().find(channel => channel.id === this.channelId()),
  );

  protected readonly headMembers = computed(() => this.resolveHeadMembers());

  protected readonly memberCount = computed(() => this.channel()?.memberIds.length ?? 0);

  protected readonly composerPlaceholder = computed(
    () => `Nachricht an #${this.channel()?.name ?? ''}`,
  );

  protected readonly openThreadMessageId = computed(() =>
    this.threadService.openMessageIdIn(channelMessagesPath(this.channelId())),
  );


  /**
   * Focuses the composer on every channel switch.
   */
  constructor() {
    effect(() => this.handleChannelSwitch(this.channelId()));
  }


  /**
   * Sends a composer message; failures surface as a toast.
   * @param text Trimmed message text from the composer.
   */
  protected async sendMessage(text: string): Promise<void> {
    try {
      await this.messageService.sendMessage(channelMessagesPath(this.channelId()), text);
    } catch {
      this.toastService.show(SEND_ERROR);
    }
  }


  /**
   * Maps an avatar path to an absolute asset URL; missing paths and
   * external URLs fall back to the placeholder.
   * @param path Avatar path stored on a user document.
   */
  protected avatarSrc(path: string | undefined): string {
    if (!path || path.startsWith('http')) return `/${DEFAULT_AVATAR_PATH}`;
    return `/${path}`;
  }


  /**
   * Toggles the thread panel for a channel message: closes it when the
   * message's thread is already open, otherwise opens or switches to it.
   * @param message Message whose thread was requested.
   */
  protected toggleThread(message: Message): void {
    this.threadService.toggle({
      messagePath: `${channelMessagesPath(this.channelId())}/${message.id}`,
      contextLabel: `# ${this.channel()?.name ?? ''}`,
    });
  }


  /**
   * Focuses the composer and closes a thread from the previous channel
   * once per channel switch.
   * @param channelId Currently routed channel id.
   */
  private handleChannelSwitch(channelId: string): void {
    if (channelId === this.focusedChannelId) return;
    if (this.focusedChannelId !== null) this.threadService.close();
    this.focusedChannelId = channelId;
    requestAnimationFrame(() => this.composer()?.focusInput());
  }


  /**
   * Resolves up to three member documents for the header avatar cluster.
   */
  private resolveHeadMembers(): UserDoc[] {
    const memberIds = this.channel()?.memberIds ?? [];
    const users = new Map(this.userService.users().map(user => [user.uid, user]));
    return memberIds
      .map(uid => users.get(uid))
      .filter((user): user is UserDoc => user !== undefined)
      .slice(0, HEAD_AVATAR_LIMIT);
  }
}
