import { Injectable, signal } from '@angular/core';
import { Message } from '../models/message.model';

/** Manages messages in channels and direct conversations. Backend integration pending. */
@Injectable({ providedIn: 'root' })
export class MessageService {
  readonly messages = signal<Message[]>([]);

  /** Placeholder — will persist message to database. */
  sendMessage(_conversationId: string, _content: string): Promise<void> {
    return Promise.resolve();
  }

  /** Placeholder — will update message content in database. */
  editMessage(_messageId: string, _content: string): Promise<void> {
    return Promise.resolve();
  }

  /** Placeholder — will add emoji reaction to message in database. */
  addReaction(_messageId: string, _emoji: string, _userId: string): Promise<void> {
    return Promise.resolve();
  }
}
