/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp } from "firebase/app";
import { getStorage, ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// Your exact web app Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyBy7maWYwB7fKfqPs4x2Hwv1yhPeeuk8Yc",
  authDomain: "arx-207a2.firebaseapp.com",
  projectId: "arx-207a2",
  storageBucket: "arx-207a2.firebasestorage.app",
  messagingSenderId: "633149834764",
  appId: "1:633149834764:web:3145ed0024bd9ee3c31029",
  measurementId: "G-7JX9KDD740"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Safely initialize analytics (prevents crashes in environments that block it)
isSupported().then(supported => {
    if (supported) {
        getAnalytics(app);
    }
});

// Initialize Storage
export const storage = getStorage(app);

/**
 * Uploads a Blob (Image or Video) to Firebase Storage and returns the public download URL.
 * 
 * @param fileBlob The raw Blob data of the generated asset.
 * @param storagePath The path in your bucket (e.g., 'outputs/12345.mp4')
 * @returns The permanent Firebase HTTP Download URL
 */
export const uploadToFirebase = async (fileBlob: Blob, storagePath: string): Promise<string> => {
    try {
        // Create a reference to the specific path in your bucket
        const storageRef = ref(storage, storagePath);

        // Upload the blob
        await uploadBytes(storageRef, fileBlob);

        // Fetch and return the public download URL
        const downloadUrl = await getDownloadURL(storageRef);
        return downloadUrl;
        
    } catch (error) {
        console.error("Firebase Upload Error:", error);
        throw new Error("Failed to upload the generated asset to Firebase Cloud Storage.");
    }
};
