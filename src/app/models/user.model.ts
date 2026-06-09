/** Profile visibility across the app. */
export type UserStatus = 'online' | 'offline' | 'away';

/** Core user profile data stored in the database. */
export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  avatarUrl: string;
  status: UserStatus;
  createdAt: Date;
}
