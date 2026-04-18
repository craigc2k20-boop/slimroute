// ═══════════════════════════════════════════════════════════
// useAuth — React hook that subscribes to Firebase auth state
// and returns { user, loading, signIn, signOut }.
// Replaces the legacy `window.fbUser` global + `fbAuthReady`
// event model with a proper React hook.
// ═══════════════════════════════════════════════════════════

import { useEffect, useState } from "react";
import { onAuth, googleSignIn, fbSignOut } from "../firebase/client.js";
import { syncFromCloud } from "../firebase/sync.js";

export function useAuth() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuth(async (u) => {
      setUser(u);
      if (u) {
        await syncFromCloud();
        // If this is a fresh cloud load, reload once so the app
        // initialises with the user's data already in localStorage.
        // (Matches the legacy behaviour.)
        const needsReload =
          !sessionStorage.getItem("ept:synced") &&
          localStorage.getItem("ept:lastActive");
        if (needsReload) {
          // no-op: we're using proper React state now, so a reload
          // isn't strictly necessary. Kept as a hook for future use.
        }
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  return {
    user,
    loading,
    signIn: googleSignIn,
    signOut: fbSignOut,
  };
}
