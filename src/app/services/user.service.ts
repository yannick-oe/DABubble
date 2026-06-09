import { Injectable, signal } from '@angular/core';
import { UserProfile } from '../models/user.model';

/** Manages user profile data. Backend integration pending. */
@Injectable({ providedIn: 'root' })
export class UserService {
  readonly users = signal<UserProfile[]>([]);

  /** Placeholder — will fetch user by ID from database. */
  getUserById(_uid: string): UserProfile | undefined {
    return undefined;
  }

  /** Placeholder — will persist profile updates to database. */
  updateProfile(_uid: string, _changes: Partial<UserProfile>): Promise<void> {
    return Promise.resolve();
  }
}
