/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getDatabase } from 'firebase/database';

export const firebaseConfig = {
  apiKey: "AIzaSyBYxTnq0atjcgG7VSROQ1MFHdYP5DcL4O8",
  authDomain: "sensixa-12f41.firebaseapp.com",
  databaseURL: "https://sensixa-12f41-default-rtdb.firebaseio.com",
  projectId: "sensixa-12f41",
  storageBucket: "sensixa-12f41.firebasestorage.app",
  messagingSenderId: "668914219649",
  appId: "1:668914219649:web:f85ad9d021f998a80feb80"
};

// Initialize Firebase safely (prevent duplicate initialization in HMR/re-renders)
const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Firebase Authentication instance
export const auth = getAuth(app);

// Google Sign-In Provider
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: 'select_account' });

// Cloud Firestore Database (Primary scalable document store)
export const db = getFirestore(app);

// Firebase Realtime Database (Alternative/fallback realtime tree)
export const rtdb = getDatabase(app);

export default app;
