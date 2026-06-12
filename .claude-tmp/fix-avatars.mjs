import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword } from 'firebase/auth';
import { getFirestore, doc, updateDoc } from 'firebase/firestore';
import { readFileSync } from 'node:fs';

const seed = JSON.parse(readFileSync('.claude-tmp/seed-ids.json', 'utf8'));
const app = initializeApp({
  apiKey: 'AIzaSyB7mlViryubpQvBOJiVYrlcyneZHda_ivY',
  authDomain: 'dabubble-b918d.firebaseapp.com',
  projectId: 'dabubble-b918d',
});
const auth = getAuth(app);
await signInWithEmailAndPassword(auth, 'test-noah@dabubble.dev', 'Test-Noah-2026!');
const db = getFirestore(app);
await updateDoc(doc(db, 'users', seed.noahUid), { avatarPath: 'avatars/Noah-Braun.png' });
await updateDoc(doc(db, 'users', seed.eliseUid), { avatarPath: 'avatars/Elise-Roth.png' });
console.log('avatars fixed');
process.exit(0);
