/**
 * CorperWe Firebase Client Configuration & Service Handlers
 */
import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  doc,
  getDoc,
  getDocFromServer,
  setDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  limit,
  getDocs,
  orderBy,
  onSnapshot,
  addDoc,
  serverTimestamp,
  Timestamp,
  FirestoreError,
  Unsubscribe,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

// Initialize Firebase App
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// CRITICAL: Initialize Firestore with the database ID specified in configuration
export const db = initializeFirestore(
  app,
  { experimentalForceLongPolling: true },
  firebaseConfig.firestoreDatabaseId
);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({
  prompt: 'select_account',
});

// Error handling types mandated by Firebase Skill
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Connection test on boot as mandated by the Firebase skill
export async function testConnection(): Promise<boolean> {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    return true;
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline or network restricted.');
      return false;
    }
    // Expected permission error on non-existent test document is acceptable
    return true;
  }
}

// Data Interfaces
export interface PopDocument {
  name: string;
  ownerId: string;
  createdAt: any;
  question?: string;
}

export interface MessageDocument {
  id?: string;
  text: string;
  createdAt: any;
}

/**
 * Authentication Helpers
 */
export async function signInWithGoogle(): Promise<User> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (error) {
    console.error('Google Sign In Error:', error);
    throw error;
  }
}

export async function logOut(): Promise<void> {
  await signOut(auth);
}

/**
 * Pop Operations
 */
export async function getPopBySlug(slug: string): Promise<PopDocument | null> {
  const path = `pops/${slug}`;
  try {
    const docRef = doc(db, 'pops', slug);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      return null;
    }
    return snap.data() as PopDocument;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, path);
  }
}

export async function findPopByOwner(
  ownerId: string
): Promise<{ slug: string; data: PopDocument } | null> {
  const path = 'pops';
  try {
    const q = query(collection(db, 'pops'), where('ownerId', '==', ownerId), limit(1));
    const snap = await getDocs(q);
    if (snap.empty) return null;
    return { slug: snap.docs[0].id, data: snap.docs[0].data() as PopDocument };
  } catch (error) {
    handleFirestoreError(error, OperationType.LIST, path);
  }
}

export async function createPopDoc(
  slug: string,
  name: string,
  ownerId: string,
  question: string = "What's your best memory of me?"
): Promise<void> {
  const path = `pops/${slug}`;
  try {
    const docRef = doc(db, 'pops', slug);
    await setDoc(docRef, {
      name,
      ownerId,
      createdAt: serverTimestamp(),
      question,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export async function updatePopQuestion(slug: string, question: string): Promise<void> {
  const path = `pops/${slug}`;
  try {
    const docRef = doc(db, 'pops', slug);
    await updateDoc(docRef, {
      question,
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function deletePopDoc(slug: string): Promise<void> {
  const path = `pops/${slug}`;
  try {
    const docRef = doc(db, 'pops', slug);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

/**
 * Anonymous Messages Operations
 */
export async function sendAnonymousMessage(slug: string, text: string): Promise<string> {
  const path = `pops/${slug}/messages`;
  try {
    const colRef = collection(db, 'pops', slug, 'messages');
    // Note: Rules strictly enforce { text, createdAt: request.time }
    const res = await addDoc(colRef, {
      text: text.trim(),
      createdAt: serverTimestamp(),
    });
    return res.id;
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeToPopMessages(
  slug: string,
  onUpdate: (messages: MessageDocument[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `pops/${slug}/messages`;
  const colRef = collection(db, 'pops', slug, 'messages');
  const q = query(colRef, orderBy('createdAt', 'desc'));

  return onSnapshot(
    q,
    (snapshot) => {
      const msgs: MessageDocument[] = [];
      snapshot.forEach((docSnap) => {
        const data = docSnap.data();
        msgs.push({
          id: docSnap.id,
          text: data.text,
          createdAt: data.createdAt,
        });
      });
      onUpdate(msgs);
    },
    (error) => {
      console.error('Messages subscription error:', error);
      if (onError) {
        onError(error);
      }
      handleFirestoreError(error, OperationType.LIST, path);
    }
  );
}

export async function deletePopMessage(slug: string, messageId: string): Promise<void> {
  const path = `pops/${slug}/messages/${messageId}`;
  try {
    const docRef = doc(db, 'pops', slug, 'messages', messageId);
    await deleteDoc(docRef);
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}
