/**
 * @file Live stream of the signed-in user's channels and channel creation.
 */
import { EnvironmentInjector, Injectable, inject, runInInjectionContext } from '@angular/core';
import { toObservable, toSignal } from '@angular/core/rxjs-interop';
import {
  Firestore,
  Timestamp,
  addDoc,
  collection,
  collectionData,
  query,
  serverTimestamp,
  where,
} from '@angular/fire/firestore';
import { Observable, catchError, map, of, switchMap } from 'rxjs';

import { Channel, ChannelDoc } from '../models/channel.model';
import { AuthService } from './auth.service';
import { ToastService } from './toast.service';

const CHANNELS_LOAD_ERROR = 'Channels konnten nicht geladen werden.';
const NOT_SIGNED_IN_ERROR = 'Cannot create a channel without a signed-in user.';

/**
 * Streams all channels the signed-in user is a member of and persists new
 * channels. Channels are sorted by creation time so a newly created channel
 * appears at the bottom of the list, as specified in the Figma flow.
 */
@Injectable({ providedIn: 'root' })
export class ChannelService {
  private readonly firestore = inject(Firestore);

  private readonly authService = inject(AuthService);

  private readonly toastService = inject(ToastService);

  private readonly injector = inject(EnvironmentInjector);

  readonly channels = toSignal(this.streamChannels(), { initialValue: [] as Channel[] });


  /**
   * Creates a channel document owned by the signed-in user, who is always
   * part of the member list.
   * @param name Validated, unique channel name.
   * @param description Optional channel description.
   * @param memberIds Uids selected in the add-people step.
   * @returns Firestore document id of the new channel.
   */
  async createChannel(name: string, description: string, memberIds: string[]): Promise<string> {
    const creatorUid = this.requireUid();
    const channel: ChannelDoc = {
      name,
      description,
      createdBy: creatorUid,
      memberIds: [...new Set([creatorUid, ...memberIds])],
      createdAt: serverTimestamp(),
    };
    const reference = await addDoc(collection(this.firestore, 'channels'), channel);
    return reference.id;
  }


  /**
   * Streams the user's channels; emits an empty list while signed out so the
   * subscription never reads without permission. The query is created in the
   * injection context as required by AngularFire.
   */
  private streamChannels(): Observable<Channel[]> {
    return toObservable(this.authService.currentUser).pipe(
      switchMap(current =>
        current
          ? runInInjectionContext(this.injector, () => this.queryChannels(current.uid))
          : of([]),
      ),
    );
  }


  /**
   * Reads all channels containing the given member live, sorted by creation
   * time; on Firestore errors a toast is shown and an empty list keeps the
   * UI functional.
   * @param uid Uid the channel membership is filtered by.
   */
  private queryChannels(uid: string): Observable<Channel[]> {
    const channelsQuery = query(
      collection(this.firestore, 'channels'),
      where('memberIds', 'array-contains', uid),
    );
    return (collectionData(channelsQuery, { idField: 'id' }) as Observable<Channel[]>).pipe(
      map(channels => [...channels].sort((a, b) => createdAtMillis(a) - createdAtMillis(b))),
      catchError(() => this.reportLoadError()),
    );
  }


  /**
   * Shows the load-error toast and recovers with an empty list.
   */
  private reportLoadError(): Observable<Channel[]> {
    this.toastService.show(CHANNELS_LOAD_ERROR);
    return of([]);
  }


  /**
   * Returns the signed-in user's uid or fails fast when called signed out.
   */
  private requireUid(): string {
    const uid = this.authService.currentUser()?.uid;
    if (!uid) throw new Error(NOT_SIGNED_IN_ERROR);
    return uid;
  }
}


/**
 * Resolves a channel's creation time in milliseconds; documents whose
 * serverTimestamp() is still pending sort to the end of the list.
 * @param channel Channel read from the live stream.
 */
function createdAtMillis(channel: Channel): number {
  return channel.createdAt instanceof Timestamp
    ? channel.createdAt.toMillis()
    : Number.MAX_SAFE_INTEGER;
}
