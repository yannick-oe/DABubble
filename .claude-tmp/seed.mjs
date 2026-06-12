/**
 * Seeds two test accounts and one test channel for the M10b verification.
 * Every created document ID is recorded in seed-ids.json; cleanup deletes
 * ONLY those IDs.
 */
import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  setDoc,
  addDoc,
  collection,
  serverTimestamp,
} from 'firebase/firestore';
import { writeFileSync } from 'node:fs';

const config = {
  apiKey: 'AIzaSyB7mlViryubpQvBOJiVYrlcyneZHda_ivY',
  authDomain: 'dabubble-b918d.firebaseapp.com',
  projectId: 'dabubble-b918d',
  storageBucket: 'dabubble-b918d.firebasestorage.app',
  messagingSenderId: '483141053813',
  appId: '1:483141053813:web:cbbac136f092f91543373c',
};

const NOAH = { email: 'test-noah@dabubble.dev', password: 'Test-Noah-2026!', name: 'Test Noah' };
const ELISE = { email: 'test-elise@dabubble.dev', password: 'Test-Elise-2026!', name: 'Test Elise' };

const app = initializeApp(config);
const auth = getAuth(app);
const db = getFirestore(app);

async function ensureAccount(spec) {
  try {
    const cred = await createUserWithEmailAndPassword(auth, spec.email, spec.password);
    return { uid: cred.user.uid, created: true };
  } catch (error) {
    if (error.code !== 'auth/email-already-in-use') throw error;
    const cred = await signInWithEmailAndPassword(auth, spec.email, spec.password);
    return { uid: cred.user.uid, created: false };
  }
}

const ids = { userDocs: [], channels: [], conversations: [], authCreated: [] };

const noah = await ensureAccount(NOAH);
if (noah.created) ids.authCreated.push(NOAH.email);
await setDoc(doc(db, 'users', noah.uid), {
  uid: noah.uid,
  name: NOAH.name,
  email: NOAH.email,
  avatarPath: 'avatars/avatar-1.svg',
  createdAt: serverTimestamp(),
});
ids.userDocs.push(noah.uid);

const elise = await ensureAccount(ELISE);
if (elise.created) ids.authCreated.push(ELISE.email);
await setDoc(doc(db, 'users', elise.uid), {
  uid: elise.uid,
  name: ELISE.name,
  email: ELISE.email,
  avatarPath: 'avatars/avatar-2.svg',
  createdAt: serverTimestamp(),
});
ids.userDocs.push(elise.uid);

const channelRef = await addDoc(collection(db, 'channels'), {
  name: 'M10b Test',
  nameLower: 'm10b test',
  description: 'Temporary verification channel',
  createdBy: noah.uid,
  memberIds: [noah.uid, elise.uid],
  createdAt: serverTimestamp(),
});
ids.channels.push(channelRef.id);

const messageRef = await addDoc(collection(db, 'channels', channelRef.id, 'messages'), {
  authorId: elise.uid,
  text: 'Mobiles Testen macht Spass',
  createdAt: serverTimestamp(),
  reactions: {},
  replyCount: 0,
  lastReplyAt: null,
});
ids.messages = [`channels/${channelRef.id}/messages/${messageRef.id}`];

writeFileSync('.claude-tmp/seed-ids.json', JSON.stringify({ ...ids, noahUid: noah.uid, eliseUid: elise.uid }, null, 2));
console.log('SEEDED', JSON.stringify({ ...ids, noahUid: noah.uid, eliseUid: elise.uid }));
process.exit(0);
