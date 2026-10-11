import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth, initializeAuth, browserLocalPersistence, browserSessionPersistence, inMemoryPersistence, browserPopupRedirectResolver, GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { getFirestore, initializeFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
export const firebaseConfig = {
  apiKey: "AIzaSyBVs8s79YpZU_ZVaqlp0smd2QBPDPImsuw",
  authDomain: "ninjaaetherion.firebaseapp.com",
  projectId: "ninjaaetherion",
  storageBucket: "ninjaaetherion.firebasestorage.app",
  messagingSenderId: "216036213326",
  appId: "1:216036213326:web:ff51e643cce8b2f33d791f",
  measurementId: "G-XR22GL167S"
};

// Environment values may override the public Web app configuration.
const config = {
  ...firebaseConfig,
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || firebaseConfig.apiKey,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || firebaseConfig.authDomain,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || firebaseConfig.projectId,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || firebaseConfig.appId,
};

export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

// Initialize on demand so importing this module is safe during Next.js rendering.
export function getFirebase() {
  const app = getApps().length ? getApp() : initializeApp(config);
  // Long polling avoids streaming responses being buffered by some proxies,
  // antivirus tools, and browser networks. Keep browser-only transport settings
  // out of the Node.js renderer. Repeated initialization uses the same settings.
  const db = typeof window === "undefined" ? getFirestore(app) : initializeFirestore(app, {
    experimentalForceLongPolling: true,
    experimentalAutoDetectLongPolling: false,
  });
  let auth;
  if (typeof window === "undefined") {
    auth = getAuth(app);
  } else {
    // Restore sessions without waiting for IndexedDB or an OAuth iframe to load.
    // This also works on plain HTTP LAN origins where browser storage may differ.
    try {
      auth = initializeAuth(app, {
        persistence: [browserLocalPersistence, browserSessionPersistence, inMemoryPersistence],
      });
    } catch (error) {
      // Fast Refresh can retain an instance created with the previous settings.
      if (error.code !== "auth/already-initialized") throw error;
      auth = getAuth(app);
    }
  }
  return { auth, db, storage: getStorage(app) };
}

export function signInWithGoogle() {
  const provider = new GoogleAuthProvider();
  provider.setCustomParameters({ prompt: "select_account" });
  return signInWithPopup(getFirebase().auth, provider, browserPopupRedirectResolver);
}
