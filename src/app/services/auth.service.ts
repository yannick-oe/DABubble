/**
 * @file Authentication service wrapping Firebase Auth and the user document.
 */
import { Injectable, inject, signal } from '@angular/core';
import {
  Auth,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
  verifyPasswordResetCode,
} from '@angular/fire/auth';
import { Firestore, doc, serverTimestamp, setDoc } from '@angular/fire/firestore';

import { UserDoc } from '../models/user.model';
import { RegistrationFormData } from './registration.service';

/**
 * Handles authentication against Firebase Auth and keeps the related
 * Firestore user document in sync.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);

  private readonly firestore = inject(Firestore);

  readonly currentUser = signal<UserDoc | null>(null);

  readonly isLoggedIn = signal(false);


  /**
   * Creates the Firebase account, sets display name and avatar on the auth
   * profile and stores the user document in Firestore.
   * @param data Validated registration form values.
   * @param avatarPath Public asset path of the selected avatar.
   */
  async register(data: RegistrationFormData, avatarPath: string): Promise<void> {
    const credential = await createUserWithEmailAndPassword(this.auth, data.email, data.password);
    await updateProfile(credential.user, { displayName: data.name, photoURL: avatarPath });
    await this.createUserDocument(credential.user.uid, data, avatarPath);
  }


  /**
   * Writes the Firestore document for a newly registered user.
   * @param uid Firebase Auth user id.
   * @param data Validated registration form values.
   * @param avatarPath Public asset path of the selected avatar.
   */
  private createUserDocument(
    uid: string,
    data: RegistrationFormData,
    avatarPath: string,
  ): Promise<void> {
    const reference = doc(this.firestore, `users/${uid}`);
    const document: UserDoc = {
      uid,
      name: data.name,
      email: data.email,
      avatarPath,
      createdAt: serverTimestamp(),
    };
    return setDoc(reference, document);
  }


  /** Placeholder — will call Firebase Auth. */
  login(_email: string, _password: string): Promise<void> {
    return Promise.resolve();
  }


  /** Placeholder — will call Firebase Auth. */
  logout(): Promise<void> {
    return Promise.resolve();
  }


  /**
   * Sends the password-reset e-mail with a continue link back to this app.
   * @param email Address entered on the forgot-password screen.
   */
  sendPasswordReset(email: string): Promise<void> {
    const settings = { url: `${window.location.origin}/auth/reset-password` };
    return sendPasswordResetEmail(this.auth, email, settings);
  }


  /**
   * Verifies a password-reset action code from the e-mail link.
   * @param code Firebase oobCode query parameter.
   * @returns The e-mail address belonging to the code.
   */
  verifyResetCode(code: string): Promise<string> {
    return verifyPasswordResetCode(this.auth, code);
  }


  /**
   * Sets the new password for a verified reset code.
   * @param code Firebase oobCode query parameter.
   * @param newPassword Password chosen on the reset screen.
   */
  completePasswordReset(code: string, newPassword: string): Promise<void> {
    return confirmPasswordReset(this.auth, code, newPassword);
  }
}
