/**
 * @file Authentication service wrapping Firebase Auth and the user document.
 */
import { Injectable, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import {
  Auth,
  GoogleAuthProvider,
  User,
  confirmPasswordReset,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  updateProfile,
  user,
  verifyPasswordResetCode,
} from '@angular/fire/auth';
import {
  DocumentReference,
  DocumentSnapshot,
  Firestore,
  doc,
  getDoc,
  serverTimestamp,
  setDoc,
  updateDoc,
} from '@angular/fire/firestore';

import { UserDoc } from '../models/user.model';
import { DEFAULT_AVATAR_PATH, RegistrationFormData } from './registration.service';

const GUEST_NAME = 'Gast';
const GUEST_EMAIL = 'gast@dabubble.dev';
const GUEST_PASSWORD = 'DABubble-Gast-2026!';

/**
 * Handles authentication against Firebase Auth and keeps the related
 * Firestore user document in sync.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly auth = inject(Auth);

  private readonly firestore = inject(Firestore);

  readonly currentUser = toSignal(user(this.auth), { initialValue: null });


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
   * Signs in with e-mail and password.
   * @param email Account e-mail address.
   * @param password Account password.
   */
  async signIn(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(this.auth, email, password);
  }


  /**
   * Signs in via Google popup and creates the user document on first login.
   */
  async signInWithGoogle(): Promise<void> {
    const credential = await signInWithPopup(this.auth, new GoogleAuthProvider());
    await this.ensureUserDocument(credential.user);
  }


  /**
   * Signs in to the fixed shared guest account and resets its profile so
   * changes from a previous guest session do not leak into the next one.
   * The credentials are deliberately client-visible (see CLAUDE.md tech
   * debt): the account has no privileges beyond a normal user.
   */
  async signInAsGuest(): Promise<void> {
    const credential = await signInWithEmailAndPassword(this.auth, GUEST_EMAIL, GUEST_PASSWORD);
    await this.resetGuestDocument(credential.user.uid);
  }


  /**
   * Overwrites the guest user document with the default profile. The doc
   * e-mail stays null so the technical account address is never shown.
   * @param uid Uid of the fixed guest account.
   */
  private resetGuestDocument(uid: string): Promise<void> {
    const reference = doc(this.firestore, `users/${uid}`);
    const document: UserDoc = {
      uid,
      name: GUEST_NAME,
      email: null,
      avatarPath: DEFAULT_AVATAR_PATH,
      createdAt: serverTimestamp(),
    };
    return setDoc(reference, document);
  }


  /**
   * Signs the current user out.
   */
  logout(): Promise<void> {
    return signOut(this.auth);
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


  /**
   * Creates the user document for popup or guest sign-ins if it is missing,
   * otherwise repairs legacy documents with external avatar URLs.
   * @param firebaseUser Authenticated Firebase user.
   */
  private async ensureUserDocument(firebaseUser: User): Promise<void> {
    const reference = doc(this.firestore, `users/${firebaseUser.uid}`);
    const snapshot = await getDoc(reference);
    if (!snapshot.exists()) {
      await setDoc(reference, this.buildUserDoc(firebaseUser));
      return;
    }
    await this.normalizeAvatarPath(reference, snapshot);
  }


  /**
   * One-time repair: replaces an external avatar URL in a loaded user
   * document with the local placeholder path.
   * @param reference Document reference of the loaded user.
   * @param snapshot Loaded document snapshot.
   */
  private async normalizeAvatarPath(
    reference: DocumentReference,
    snapshot: DocumentSnapshot,
  ): Promise<void> {
    const avatarPath = (snapshot.data() as UserDoc | undefined)?.avatarPath ?? '';
    if (!avatarPath.startsWith('http')) return;
    await updateDoc(reference, { avatarPath: DEFAULT_AVATAR_PATH });
  }


  /**
   * Maps a Firebase user to the Firestore document shape. The avatar is
   * always the local placeholder; external photo URLs are ignored.
   * @param firebaseUser Authenticated Firebase user.
   */
  private buildUserDoc(firebaseUser: User): UserDoc {
    return {
      uid: firebaseUser.uid,
      name: firebaseUser.displayName ?? GUEST_NAME,
      email: firebaseUser.email,
      avatarPath: DEFAULT_AVATAR_PATH,
      createdAt: serverTimestamp(),
    };
  }
}
