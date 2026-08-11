import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from "firebase/storage";
import { getFirestore } from "firebase/firestore";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signOut,
  sendPasswordResetEmail,
  updateProfile,
  onAuthStateChanged,
  type User,
} from "firebase/auth";

// Your web app's Firebase configuration
// Ensure these match the variables in your .env file
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const storage = getStorage(app);
export const auth = getAuth(app);
export const db = getFirestore(app);

const googleProvider = new GoogleAuthProvider();

/**
 * Uploads a Blob (image or video) to Firebase Storage and returns the public download URL.
 * * @param blob - The raw Blob data of the generated asset.
 * @param path - The destination path in the bucket (e.g., 'outputs/task123.mp4').
 * @returns The public download URL.
 */
export const uploadToFirebase = async (blob: Blob, path: string): Promise<string> => {
  try {
    const storageRef = ref(storage, path);
    
    // Explicitly set the MIME type so browsers render the asset correctly
    const isVideo = path.toLowerCase().endsWith('.mp4');
    const metadata = {
        contentType: isVideo ? 'video/mp4' : 'image/png'
    };

    // Upload the payload
    const snapshot = await uploadBytes(storageRef, blob, metadata);
    
    // Retrieve and return the permanent download URL
    const downloadUrl = await getDownloadURL(snapshot.ref);
    return downloadUrl;
    
  } catch (error) {
    console.error("Firebase upload error:", error);
    throw new Error("Failed to upload asset to Firebase Storage.");
  }
};

/**
 * Deletes a file from Firebase Storage by its path (e.g. 'outputs/uid/task123.mp4').
 * Safe to call even if the file was already removed — Storage's "not found"
 * error is swallowed so callers don't need special-case handling.
 */
export const deleteFromFirebase = async (path: string): Promise<void> => {
  try {
    await deleteObject(ref(storage, path));
  } catch (error: any) {
    if (error?.code !== 'storage/object-not-found') {
      console.error("Firebase delete error:", error);
      throw new Error("Failed to delete asset from Firebase Storage.");
    }
  }
};

// --- Auth helpers ---

export const signUpWithEmail = async (email: string, password: string, displayName?: string) => {
  const cred = await createUserWithEmailAndPassword(auth, email, password);
  if (displayName) {
    try {
      await updateProfile(cred.user, { displayName });
    } catch (e) {
      console.warn("Failed to set display name", e);
    }
  }
  return cred.user;
};

export const signInWithEmail = async (email: string, password: string) => {
  const cred = await signInWithEmailAndPassword(auth, email, password);
  return cred.user;
};

export const signInWithGoogle = async () => {
  const cred = await signInWithPopup(auth, googleProvider);
  return cred.user;
};

export const signOutUser = () => signOut(auth);

export const resetPassword = (email: string) => sendPasswordResetEmail(auth, email);

/**
 * Returns a fresh Firebase ID token for the currently signed-in user.
 * This token is sent to our own serverless API routes so they can verify
 * the caller is an authenticated user before touching any third-party
 * API keys (Wavespeed, Grok, etc). It is never sent to third parties directly.
 */
export const getFreshIdToken = async (forceRefresh = false): Promise<string> => {
  const user = auth.currentUser;
  if (!user) return '';
  try {
    return await user.getIdToken(forceRefresh);
  } catch (e) {
    console.error("Failed to get ID token", e);
    return '';
  }
};

export { onAuthStateChanged };
export type { User };
