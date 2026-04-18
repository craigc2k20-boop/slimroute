// ═══════════════════════════════════════════════════════════
// DATE & WEEK HELPERS
// Lifted verbatim from legacy app.
// ═══════════════════════════════════════════════════════════

import { DAYS } from "./constants.js";

// Local date string YYYY-MM-DD (avoids UTC drift)
export const lds = (d) =>
  `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

// Week-start key (Monday) for any date
export const wk = (d) => {
  const x = new Date(d);
  const dy = x.getDay();
  x.setDate(x.getDate() - dy + (dy === 0 ? -6 : 1));
  return lds(x);
};

// 7-day array starting at a week key
export const wkD = (k) => {
  const m = new Date(k + "T12:00:00");
  return DAYS.map((_, i) => {
    const d = new Date(m);
    d.setDate(m.getDate() + i);
    return d;
  });
};

// Short friendly format: "5 Apr"
export const fmt = (d) => d.toLocaleDateString("en-GB", { day: "numeric", month: "short" });

// ═══════════════════════════════════════════════════════════
// DAY MODE — classifies a date as past / present / future
// relative to "now", with a configurable grace window.
//
// Grace window: if `date` is yesterday AND the current time is
// still within `graceHours` of midnight (e.g. 0:00–4:00 AM and
// graceHours = 4), yesterday counts as "present" so the user
// can still log last night's drinks.
//
// Defaults: graceHours = 4 — matches the "present with grace"
// rule agreed in the design spec.
// ═══════════════════════════════════════════════════════════
export function getDayMode(date, { graceHours = 4, now = new Date() } = {}) {
  const target = lds(date);
  const today = lds(now);

  if (target === today) return "present";

  // Is the target yesterday?
  const y = new Date(now);
  y.setDate(y.getDate() - 1);
  const yesterday = lds(y);
  if (target === yesterday && now.getHours() < graceHours) return "present";

  // Compare dates lexicographically — lds() returns YYYY-MM-DD so string
  // comparison is equivalent to date comparison.
  return target < today ? "past" : "future";
}

// Meal-name helpers — "Lunch — Chicken Curry" → section "Lunch", label "Chicken Curry"
export const gS = (n) => {
  const i = n.indexOf(" — ");
  return i >= 0 ? n.slice(0, i) : n;
};
export const gL = (n) => {
  const i = n.indexOf(" — ");
  return i >= 0 ? n.slice(i + 3) : null;
};
