import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, updateDoc, collection, getDocs, deleteDoc, addDoc, serverTimestamp } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const seed = JSON.parse(readFileSync('.claude-tmp/seed-ids.json', 'utf8'));
const channelId = seed.channels[0];
const app = initializeApp({
  apiKey: 'AIzaSyB7mlViryubpQvBOJiVYrlcyneZHda_ivY',
  authDomain: 'dabubble-b918d.firebaseapp.com',
  projectId: 'dabubble-b918d',
});
const auth = getAuth(app);
await signInWithEmailAndPassword(auth, 'test-noah@dabubble.dev', 'Test-Noah-2026!');
const db = getFirestore(app);

await updateDoc(doc(db, 'channels', channelId), { name: 'M10b Test', nameLower: 'm10b test', memberIds: [seed.noahUid, seed.eliseUid] });
const messages = await getDocs(collection(db, 'channels', channelId, 'messages'));
for (const message of messages.docs) {
  const replies = await getDocs(collection(db, 'channels', channelId, 'messages', message.id, 'replies'));
  for (const reply of replies.docs) await deleteDoc(reply.ref);
  await deleteDoc(message.ref);
}
const messageRef = await addDoc(collection(db, 'channels', channelId, 'messages'), {
  authorId: seed.eliseUid,
  text: 'Mobiles Testen macht Spass',
  createdAt: serverTimestamp(),
  reactions: {},
  replyCount: 0,
  lastReplyAt: null,
});
console.log('reset done, seed message', messageRef.id);
process.exit(0);
