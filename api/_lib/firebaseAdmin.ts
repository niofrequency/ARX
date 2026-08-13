import { initializeApp, getApps, cert, type App } from 'firebase-admin/app';
import { getFirestore, type Firestore } from 'firebase-admin/firestore';
import { getStorage, type Storage } from 'firebase-admin/storage';

// This runs on Vercel's Node.js runtime only (not Edge — firebase-admin
// needs Node APIs). It authenticates as your Firebase project directly via
// a service account, which is what lets the webhook write into any user's
// Firestore/Storage even though the request isn't coming from that user's
// own signed-in browser session.

let app: App | null = null;

const getAdminApp = (): App => {
  if (app) return app;
  if (getApps().length > 0) {
    app = getApps()[0];
    return app;
  }

  const base64 = process.env.FIREBASE_SERVICE_ACCOUNT_BASE64;
  if (!base64) {
    throw new Error('Missing FIREBASE_SERVICE_ACCOUNT_BASE64 environment variable.');
  }

  const serviceAccountJson = Buffer.from(base64, 'base64').toString('utf-8');
  const serviceAccount = JSON.parse(serviceAccountJson);

  app = initializeApp({
    credential: cert(serviceAccount),
    storageBucket: process.env.VITE_FIREBASE_STORAGE_BUCKET,
  });
  return app;
};

export const adminDb = (): Firestore => getFirestore(getAdminApp());
export const adminStorage = (): Storage => getStorage(getAdminApp());
