/**
 * @file Live message streams and message creation for channel chats.
 */
import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import {
  Firestore,
  addDoc,
  collection,
  collectionData,
  orderBy,
  query,
  serverTimestamp,
} from '@angular/fire/firestore';
import { Observable, catchError, of } from 'rxjs';

import { Message, MessageDoc } from '../models/message.model';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

const MESSAGES_LOAD_ERROR = 'Nachrichten konnten nicht geladen werden.';

/**
 * Builds the messages subcollection path of a channel.
 * @param channelId Firestore id of the channel.
 */
export function channelMessagesPath(channelId: string): string {
  return `channels/${channelId}/messages`;
}


/**
 * Builds the messages subcollection path of a direct conversation.
 * @param conversationId Deterministic id of the conversation.
 */
export function directMessagesPath(conversationId: string): string {
  return `directMessages/${conversationId}/messages`;
}


/**
 * Streams the messages of an arbitrary messages collection (channel chat,
 * direct conversation, later thread replies) ordered by creation time and
 * persists new messages with the denormalized thread fields initialized.
 */
@Injectable({ providedIn: 'root' })
export class MessageService {
  private readonly firestore = inject(Firestore);

  private readonly authService = inject(AuthService);

  private readonly toastService = inject(ToastService);

  private readonly injector = inject(EnvironmentInjector);


  /**
   * Streams a messages collection live, oldest first. Safe to call from
   * reactive callbacks — the query is created in the injection context.
   * @param collectionPath Firestore path of the messages collection.
   */
  streamMessages(collectionPath: string): Observable<Message[]> {
    return runInInjectionContext(this.injector, () => this.queryMessages(collectionPath));
  }


  /**
   * Persists a message authored by the signed-in user with empty reactions
   * and thread counters, matching the data-model defaults.
   * @param collectionPath Firestore path of the target messages collection.
   * @param text Trimmed message text.
   */
  async sendMessage(collectionPath: string, text: string): Promise<void> {
    const message: MessageDoc = {
      authorId: this.authService.requireUid(),
      text,
      createdAt: serverTimestamp(),
      reactions: {},
      replyCount: 0,
      lastReplyAt: null,
    };
    await runInInjectionContext(this.injector, () =>
      addDoc(collection(this.firestore, collectionPath), message),
    );
  }


  /**
   * Builds the live query; on Firestore errors a toast is shown and an
   * empty list keeps the UI functional.
   * @param collectionPath Firestore path of the messages collection.
   */
  private queryMessages(collectionPath: string): Observable<Message[]> {
    const messagesQuery = query(
      collection(this.firestore, collectionPath),
      orderBy('createdAt'),
    );
    return (collectionData(messagesQuery, { idField: 'id' }) as Observable<Message[]>).pipe(
      catchError(() => this.reportLoadError()),
    );
  }


  /**
   * Shows the load-error toast and recovers with an empty list.
   */
  private reportLoadError(): Observable<Message[]> {
    this.toastService.show(MESSAGES_LOAD_ERROR);
    return of([]);
  }
}
