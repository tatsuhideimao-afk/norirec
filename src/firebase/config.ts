import { initializeApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { FIREBASE_CONFIG } from '../config/firebase';

const app = getApps().length === 0 ? initializeApp(FIREBASE_CONFIG) : getApps()[0];

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
