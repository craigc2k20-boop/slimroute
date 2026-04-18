// ═══════════════════════════════════════════════════════════
// FIREBASE CLIENT — modular SDK (v9+), replaces the global
// `firebase.initializeApp` + compat SDK from the legacy app.
// The API surface is the same; imports are now tree-shakeable.
// ═══════════════════════════════════════════════════════════

import { initializeApp } from "firebase/app";
import {
  getAuth,
  setPersistence,
  browserLocalPersistence,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  signOut,
  onAuthStateChanged,
} from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Same Firebase project as the legacy app — this means the new
// version reads the same user accounts and same Firestore data,
// which is exactly what we want for a side-by-side cutover.
const firebaseConfig = {
  apiKey: "AIzaSyAY5W_cqcJP6XMQb9HkeTkSbH-UO3J0Ovc",
  authDomain: "eating-plan-a8952.firebaseapp.com",
  projectId: "eating-plan-a8952",
  storageBucket: "eating-plan-a8952.firebasestorage.app",
  messagingSenderId: "373643178226",
  appId: "1:373643178226:web:dcef8169b13fb7953f206b",
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

// Kick off persistence + handle redirect result (mirror of legacy behaviour)
setPersistence(auth, browserLocalPersistence).catch((e) =>
  console.warn("Auth persistence failed:", e)
);
getRedirectResult(auth).catch((e) => console.warn("Redirect result:", e));

// ───────────────────────────────────────────────────────────
// Public auth helpers
// ───────────────────────────────────────────────────────────
export function googleSignIn() {
  const provider = new GoogleAuthProvider();
  return signInWithPopup(auth, provider).catch((err) => {
    console.warn("Popup failed, trying redirect", err);
    return signInWithRedirect(auth, provider);
  });
}

export function fbSignOut() {
  localStorage.removeItem("ept:accessCache");
  return signOut(auth).then(() => window.location.reload());
}

// Subscribe to auth changes — returns an unsubscribe fn
export function onAuth(cb) {
  return onAuthStateChanged(auth, cb);
}
