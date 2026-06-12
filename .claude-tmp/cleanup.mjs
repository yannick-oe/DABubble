/**
 * Scoped cleanup: deletes ONLY the documents recorded in seed-ids.json
 * plus the deterministic Noah<->Elise test conversation, then removes the
 * two test auth accounts after asserting their uids match the record.
 */
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, deleteUser } from 'firebase/auth';
import { getFirestore, doc, deleteDoc, getDoc, collection, getDocs } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const seed = JSON.parse(readFileSync('.claude-tmp/seed-ids.json', 'utf8'));
const app = initializeApp({
  apiKey: 'AIzaSyB7mlViryubpQvBOJiVYrlcyneZHda_ivY',
  authDomain: 'dabubble-b918d.firebaseapp.com',
  projectId: 'dabubble-b918d',
});
const auth = getAuth(app);
const noahCred = await signInWithEmailAndPassword(auth, 'test-noah@dabubble.dev', 'Test-Noah-2026!');
if (noahCred.user.uid !== seed.noahUid) throw new Error('uid mismatch noah — aborting');
const db = getFirestore(app);

async function deleteMessageTree(basePath) {
  const messages = await getDocs(collection(db, ...basePath.split('/')));
  for (const message of messages.docs) {
    const replies = await getDocs(collection(db, ...basePath.split('/'), message.id, 'replies'));
    for (const reply of replies.docs) await deleteDoc(reply.ref);
    await deleteDoc(message.ref);
  }
  return messages.size;
}

for (const channelId of seed.channels) {
  const count = await deleteMessageTree(`channels/${channelId}/messages`);
  await deleteDoc(doc(db, 'channels', channelId));
  console.log(`deleted channels/${channelId} (+${count} messages)`);
}

const conversationId = [seed.noahUid, seed.eliseUid].sort().join('_');
const conversationRef = doc(db, 'directMessages', conversationId);
if ((await getDoc(conversationRef)).exists()) {
  const count = await deleteMessageTree(`directMessages/${conversationId}/messages`);
  await deleteDoc(conversationRef);
  console.log(`deleted directMessages/${conversationId} (+${count} messages)`);
} else {
  console.log('no test conversation found');
}

for (const uid of seed.userDocs) {
  await deleteDoc(doc(db, 'users', uid));
  console.log(`deleted users/${uid}`);
}

if (noahCred.user.uid === seed.noahUid) await deleteUser(noahCred.user);
console.log('deleted auth account test-noah');
const eliseCred = await signInWithEmailAndPassword(auth, 'test-elise@dabubble.dev', 'Test-Elise-2026!');
if (eliseCred.user.uid !== seed.eliseUid) throw new Error('uid mismatch elise — aborting');
await deleteUser(eliseCred.user);
console.log('deleted auth account test-elise');
process.exit(0);
