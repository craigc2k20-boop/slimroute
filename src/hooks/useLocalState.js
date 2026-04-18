// ═══════════════════════════════════════════════════════════
// useLocalState — useState that persists to localStorage under
// the "ept:" namespace and triggers debounced cloud sync on
// every write. Drop-in replacement for lots of legacy code.
// ═══════════════════════════════════════════════════════════

import { useCallback, useEffect, useState } from "react";
import { debounceSyncToCloud } from "../firebase/sync.js";

const NS = "ept:";

function read(key, initial) {
  try {
    const raw = localStorage.getItem(NS + key);
    if (raw === null) return typeof initial === "function" ? initial() : initial;
    return JSON.parse(raw);
  } catch {
    return typeof initial === "function" ? initial() : initial;
  }
}

export function useLocalState(key, initial) {
  const [value, setValue] = useState(() => read(key, initial));

  // Persist + enqueue cloud sync
  useEffect(() => {
    try {
      localStorage.setItem(NS + key, JSON.stringify(value));
      debounceSyncToCloud();
    } catch (e) {
      console.warn("useLocalState persist failed for " + key, e);
    }
  }, [key, value]);

  // Setter that also supports functional updates
  const set = useCallback((updater) => {
    setValue((prev) =>
      typeof updater === "function" ? updater(prev) : updater
    );
  }, []);

  return [value, set];
}

// Simple debounce hook — lifted from the legacy app
export function useDebounce(value, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const handler = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(handler);
  }, [value, delay]);
  return debounced;
}
