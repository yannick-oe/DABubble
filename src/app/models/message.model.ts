import { Reaction } from './reaction.model';

/** A chat message in a channel or direct conversation. */
export interface Message {
  id: string;
  senderId: string;
  content: string;
  reactions: Reaction[];
  threadId: string | null;
  createdAt: Date;
  editedAt: Date | null;
}
