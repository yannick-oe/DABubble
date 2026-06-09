import { Injectable, signal } from '@angular/core';
import { UserProfile } from '../models/user.model';

/** Handles authentication state. Backend integration pending. */
@Injectable({ providedIn: 'root' })
export class AuthService {
  readonly currentUser = signal<UserProfile | null>(null);
  readonly isLoggedIn = signal(false);

  /** Placeholder — will call Firebase Auth. */
  login(_email: string, _password: string): Promise<void> {
    return Promise.resolve();
  }

  /** Placeholder — will call Firebase Auth. */
  logout(): Promise<void> {
    return Promise.resolve();
  }

  /** Placeholder — will call Firebase Auth. */
  register(_email: string, _password: string, _name: string): Promise<void> {
    return Promise.resolve();
  }

  /** Placeholder — will send password-reset email. */
  sendPasswordReset(_email: string): Promise<void> {
    return Promise.resolve();
  }
}
