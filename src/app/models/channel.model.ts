/** A workspace channel (public group conversation). */
export interface Channel {
  id: string;
  name: string;
  description: string;
  createdBy: string;
  memberIds: string[];
  createdAt: Date;
}
