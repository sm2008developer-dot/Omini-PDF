/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
  User as FirebaseUser,
  updateProfile,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  query,
  where,
  getDocs,
  orderBy,
  limit,
  serverTimestamp,
  increment,
} from 'firebase/firestore';
import { auth, googleProvider, db } from './firebase.js';
import { User, DocumentHistory, Transaction, PlatformLimits } from '../utils/api.js';

// Dedicated list of admin emails
export const ADMIN_EMAILS = [
  'codegarage1@gmail.com',
  'mukherjeesanjib60250@gmail.com',
  'admin@ominipdf.ai.studio',
  'admin@sensixa.com',
];

export function isUserAdmin(email?: string | null): boolean {
  if (!email) return false;
  const clean = email.trim().toLowerCase();
  return ADMIN_EMAILS.includes(clean);
}

/**
 * Sync or create user profile in Firestore (with safe auth fallback if Firestore fails)
 */
export async function syncUserProfile(
  fbUser: FirebaseUser,
  additionalData?: { name?: string }
): Promise<User> {
  const email = (fbUser.email || '').trim().toLowerCase();
  const isAdmin = isUserAdmin(email);
  const nowIso = new Date().toISOString();
  const fallbackName =
    additionalData?.name ||
    fbUser.displayName ||
    (email ? email.split('@')[0] : 'PDF User');

  const fallbackUser: User = {
    id: fbUser.uid,
    name: fallbackName,
    email,
    role: isAdmin ? 'admin' : 'user',
    plan: isAdmin ? 'pro' : 'free',
    pdfOperationsUsed: 0,
    aiQueriesUsed: 0,
    subscriptionDurationDays: isAdmin ? 365 : 30,
    subscriptionStatus: isAdmin ? 'active' : 'none',
    proSubscribedAt: isAdmin ? nowIso : undefined,
    proExpiresAt: isAdmin ? new Date(Date.now() + 365 * 86400000).toISOString() : null,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  try {
    const userRef = doc(db, 'users', fbUser.uid);
    const userSnap = await getDoc(userRef);

    if (userSnap.exists()) {
      const existing = userSnap.data() as User;
      if (isAdmin && (existing.role !== 'admin' || existing.plan !== 'pro')) {
        const update = {
          role: 'admin' as const,
          plan: 'pro' as const,
          subscriptionStatus: 'active' as const,
          subscriptionDurationDays: 365,
          proExpiresAt: new Date(Date.now() + 365 * 86400000).toISOString(),
          updatedAt: nowIso,
        };
        await updateDoc(userRef, update).catch(() => {});
        return { ...existing, ...update, id: fbUser.uid };
      }
      return { ...existing, id: fbUser.uid };
    }

    await setDoc(userRef, {
      ...fallbackUser,
      firestoreCreatedAt: serverTimestamp(),
      firestoreUpdatedAt: serverTimestamp(),
    });
  } catch (firestoreErr) {
    console.warn('Firestore profile sync skipped (continuing with Firebase Auth profile):', firestoreErr);
  }

  return fallbackUser;
}

/**
 * Register with Email & Password
 */
export async function registerWithEmail(
  name: string,
  email: string,
  pass: string
): Promise<{ user: User }> {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  if (name.trim()) {
    await updateProfile(cred.user, { displayName: name.trim() });
  }
  const user = await syncUserProfile(cred.user, { name: name.trim() });
  return { user };
}

/**
 * Login with Email & Password
 */
export async function loginWithEmail(
  email: string,
  pass: string
): Promise<{ user: User }> {
  const cred = await signInWithEmailAndPassword(auth, email.trim(), pass);
  const user = await syncUserProfile(cred.user);
  return { user };
}

/**
 * Login / Sign Up with Google (popup with redirect fallback if popup blocked outside iframe)
 */
export async function loginWithGoogle(): Promise<{ user?: User; redirected?: boolean }> {
  try {
    const cred = await signInWithPopup(auth, googleProvider);
    const user = await syncUserProfile(cred.user);
    return { user };
  } catch (err: unknown) {
    const code = (err as { code?: string })?.code || '';
    const isInsideIframe = typeof window !== 'undefined' && window.self !== window.top;
    if (code === 'auth/popup-blocked' && !isInsideIframe) {
      await signInWithRedirect(auth, googleProvider);
      return { redirected: true };
    }
    throw err;
  }
}

/**
 * Resolve any pending Google redirect login result on page load
 */
export async function checkGoogleRedirectResult(): Promise<User | null> {
  try {
    const res = await getRedirectResult(auth);
    if (res?.user) {
      return await syncUserProfile(res.user);
    }
    return null;
  } catch (err) {
    console.warn('Google redirect result check notice:', err);
    return null;
  }
}

/**
 * Send Password Reset Email
 */
export async function resetPasswordEmail(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email.trim());
}

/**
 * Sign Out
 */
export async function logoutFirebase(): Promise<void> {
  await signOut(auth);
}

/**
 * Listen to Auth State changes
 */
export function subscribeToAuth(callback: (user: User | null) => void): () => void {
  return onAuthStateChanged(auth, async (fbUser) => {
    if (!fbUser) {
      callback(null);
      return;
    }
    try {
      const profile = await syncUserProfile(fbUser);
      callback(profile);
    } catch (err) {
      console.warn('Failed to sync user profile from Firestore:', err);
      // Fallback object from Auth token
      callback({
        id: fbUser.uid,
        name: fbUser.displayName || fbUser.email?.split('@')[0] || 'User',
        email: fbUser.email || '',
        role: isUserAdmin(fbUser.email) ? 'admin' : 'user',
        plan: isUserAdmin(fbUser.email) ? 'pro' : 'free',
        pdfOperationsUsed: 0,
        aiQueriesUsed: 0,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      });
    }
  });
}

/**
 * Log PDF operation in Firestore
 */
export async function logPdfOperationInFirestore(
  userId: string,
  data: {
    toolName: string;
    fileName: string;
    fileSize: number;
    resultSummary: string;
  }
): Promise<{ success: boolean; user?: User; historyRecord?: DocumentHistory }> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);

  let updatedUser: User | undefined;
  if (userSnap.exists()) {
    const uData = userSnap.data() as User;
    if (uData.plan === 'free') {
      await updateDoc(userRef, {
        pdfOperationsUsed: increment(1),
        updatedAt: new Date().toISOString(),
      });
      updatedUser = {
        ...uData,
        pdfOperationsUsed: (uData.pdfOperationsUsed || 0) + 1,
      };
    } else {
      updatedUser = uData;
    }
  }

  // Add document history record
  const historyRef = doc(collection(db, 'documents'));
  const historyRecord: DocumentHistory = {
    id: historyRef.id,
    userId,
    toolName: data.toolName,
    fileName: data.fileName,
    fileSize: data.fileSize,
    resultSummary: data.resultSummary,
    timestamp: new Date().toISOString(),
    status: 'success',
  };

  await setDoc(historyRef, {
    ...historyRecord,
    createdAt: serverTimestamp(),
  });

  return { success: true, user: updatedUser, historyRecord };
}

/**
 * Increment AI query in Firestore
 */
export async function incrementAiUsageInFirestore(userId: string): Promise<User | null> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return null;

  const uData = userSnap.data() as User;
  if (uData.plan === 'free') {
    await updateDoc(userRef, {
      aiQueriesUsed: increment(1),
      updatedAt: new Date().toISOString(),
    });
    return {
      ...uData,
      aiQueriesUsed: (uData.aiQueriesUsed || 0) + 1,
    };
  }
  return uData;
}

/**
 * Get User History from Firestore
 */
export async function getUserHistoryFromFirestore(userId: string): Promise<DocumentHistory[]> {
  try {
    const q = query(
      collection(db, 'documents'),
      where('userId', '==', userId),
      orderBy('createdAt', 'desc'),
      limit(50)
    );
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.data() as DocumentHistory);
  } catch {
    // If compound index is still building, query without orderBy
    try {
      const fallbackQuery = query(
        collection(db, 'documents'),
        where('userId', '==', userId),
        limit(50)
      );
      const fallbackSnap = await getDocs(fallbackQuery);
      return fallbackSnap.docs.map((d) => d.data() as DocumentHistory);
    } catch {
      return [];
    }
  }
}

/**
 * Activate Pro subscription in Firestore directly (for coupon/voucher or instant unlock)
 */
export async function activateProInFirestore(
  userId: string,
  options: {
    durationDays?: number;
    paymentMethod: string;
    paymentId?: string;
    amount?: number;
  }
): Promise<{ success: boolean; user: User; transaction: Transaction }> {
  const userRef = doc(db, 'users', userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) {
    throw new Error('User profile not found in Firestore.');
  }

  const durationDays = options.durationDays || 30;
  const now = new Date();
  const proExpiresAt = new Date(now.getTime() + durationDays * 86400000).toISOString();
  const paymentId = options.paymentId || `PRO_${Date.now().toString(36).toUpperCase()}`;
  const amount = options.amount ?? 0;

  const updateFields = {
    plan: 'pro' as const,
    subscriptionDurationDays: durationDays,
    proSubscribedAt: now.toISOString(),
    proExpiresAt,
    subscriptionStatus: 'active' as const,
    updatedAt: now.toISOString(),
  };

  await updateDoc(userRef, updateFields);

  const txRef = doc(collection(db, 'transactions'));
  const tx: Transaction = {
    id: txRef.id,
    userId,
    userEmail: (userSnap.data() as User).email,
    amount,
    currency: 'INR',
    plan: 'pro',
    durationDays,
    paymentId,
    paymentMethod: options.paymentMethod,
    status: 'completed',
    createdAt: now.toISOString(),
  };

  await setDoc(txRef, {
    ...tx,
    timestamp: serverTimestamp(),
  });

  const updatedUser: User = {
    ...(userSnap.data() as User),
    ...updateFields,
    id: userId,
  };

  return { success: true, user: updatedUser, transaction: tx };
}
