import { initializeApp, getApps, getApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut } from "firebase/auth";

// Helper to get Firebase configuration from Environment or LocalStorage
export const getFirebaseConfig = () => {
  const localConfig = localStorage.getItem("firebaseConfig");
  if (localConfig) {
    try {
      return JSON.parse(localConfig);
    } catch (e) {
      console.error("Error parsing local Firebase config:", e);
    }
  }

  // Fallback to environment variables
  return {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "",
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "",
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "",
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "",
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "",
    appId: import.meta.env.VITE_FIREBASE_APP_ID || "",
  };
};

const config = getFirebaseConfig();

// Check if config has minimum required fields
const isValidConfig = config && config.apiKey && config.projectId;

let app;
let db = null;
let auth = null;
let googleProvider = null;

if (isValidConfig) {
  try {
    app = getApps().length === 0 ? initializeApp(config) : getApp();
    db = getFirestore(app);
    auth = getAuth(app);
    googleProvider = new GoogleAuthProvider();
    googleProvider.setCustomParameters({ prompt: 'select_account' });
  } catch (error) {
    console.error("Firebase initialization failed:", error);
  }
}

export { app, db, auth, googleProvider, isValidConfig };

// Auth Helper Functions
export const loginWithGoogle = async () => {
  if (!auth || !googleProvider) throw new Error("Firebase is not configured yet.");
  return signInWithPopup(auth, googleProvider);
};

export const logout = async () => {
  if (!auth) return;
  return signOut(auth);
};
