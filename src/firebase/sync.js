// ═══════════════════════════════════════════════════════════
// CLOUD SYNC — mirrors legacy behaviour:
//   • localStorage is the source of truth for active sessions
//   • Writes are debounced and flushed to Firestore ~2s after idle
//   • Reads from cloud only run if the user has been idle >30s
//   • Keys live under the "ept:" namespace in localStorage
// Same Firestore document shape as v1, so data is cross-version.
// ═══════════════════════════════════════════════════════════

import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "./client.js";

const NS = "ept:";
const IDLE_WINDOW_MS = 30_000;
const DEBOUNCE_MS = 2_000;

// Exposed so the UI can display sync status in the header
export const syncState = { status: "" };

let _syncTimer = null;

export function syncToCloud() {
  const user = auth.currentUser;
  if (!user) return;
  const store = {};
  for (let i = 0; i < localStorage.length; i++) {
    const k = localStorage.key(i);
    if (k && k.startsWith(NS)) store[k.slice(NS.length)] = localStorage.getItem(k);
  }
  setDoc(
    doc(db, "users", user.uid),
    {
      data: JSON.stringify(store),
      updatedAt: serverTimestamp(),
      displayName: user.displayName || "",
      email: user.email || "",
    },
    { merge: true }
  )
    .then(() => {
      syncState.status = "Synced " + new Date().toLocaleTimeString();
    })
    .catch((e) => {
      syncState.status = "Sync failed";
      console.warn("Cloud save failed", e);
    });
}

export function debounceSyncToCloud() {
  localStorage.setItem(NS + "lastActive", String(Date.now()));
  if (_syncTimer) clearTimeout(_syncTimer);
  _syncTimer = setTimeout(syncToCloud, DEBOUNCE_MS);
}

export async function syncFromCloud() {
  const user = auth.currentUser;
  if (!user) return;
  const lastLocal = parseInt(localStorage.getItem(NS + "lastActive") || "0");
  if (Date.now() - lastLocal < IDLE_WINDOW_MS) {
    syncState.status = "Skipped (recent local activity)";
    return;
  }
  try {
    const snap = await getDoc(doc(db, "users", user.uid));
    if (snap.exists() && snap.data().data) {
      const cloud = JSON.parse(snap.data().data);
      Object.entries(cloud).forEach(([k, v]) => {
        localStorage.setItem(NS + k, v);
      });
      syncState.status = "Loaded from cloud";
    }
  } catch (e) {
    console.warn("Cloud load failed", e);
  }
}

// ───────────────────────────────────────────────────────────
// Thin storage API that mirrors the `window.storage` shim from
// the legacy app. Useful if any screen was calling it directly.
// ───────────────────────────────────────────────────────────
export const storage = {
  async get(key) {
    const val = localStorage.getItem(NS + key);
    if (val === null) throw new Error("Key not found: " + key);
    return { key, value: val };
  },
  async set(key, value) {
    localStorage.setItem(NS + key, typeof value === "string" ? value : JSON.stringify(value));
    debounceSyncToCloud();
    return { key, value };
  },
  async delete(key) {
    localStorage.removeItem(NS + key);
    debounceSyncToCloud();
    return { key, deleted: true };
  },
  async list(prefix) {
    const keys = [];
    const pre = NS + (prefix || "");
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(pre)) keys.push(k.slice(NS.length));
    }
    return { keys };
  },
};
