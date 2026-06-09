import { Injectable, signal } from '@angular/core';
import { Channel } from '../models/channel.model';

/** Manages channel data and membership. Backend integration pending. */
@Injectable({ providedIn: 'root' })
export class ChannelService {
  readonly channels = signal<Channel[]>([]);
  readonly activeChannelId = signal<string | null>(null);

  /** Placeholder — will persist new channel to database. */
  createChannel(_channel: Omit<Channel, 'id' | 'createdAt'>): Promise<void> {
    return Promise.resolve();
  }

  /** Placeholder — will update channel members in database. */
  addMember(_channelId: string, _userId: string): Promise<void> {
    return Promise.resolve();
  }

  /** Placeholder — will remove user from channel in database. */
  leaveChannel(_channelId: string, _userId: string): Promise<void> {
    return Promise.resolve();
  }
}
