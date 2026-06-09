/** A threaded reply chain attached to a parent message. */
export interface Thread {
  id: string;
  parentMessageId: string;
  replyCount: number;
  lastReplyAt: Date | null;
}
