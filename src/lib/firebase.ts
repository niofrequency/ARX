import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";

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
