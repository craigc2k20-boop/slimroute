// ═══════════════════════════════════════════════════════════
// MEAL STORE — per-day meal persistence with seed-on-first-visit.
//
// Data model:
//   localStorage key:  ept:meals:YYYY-MM-DD
//   value (JSON):      { dayType: "gym"|"rest", meals: [...] }
//
// When a day is first opened, we stamp a fresh COPY of the
// template for its dayType into that day. Every subsequent edit
// lives in that day's copy only — "B: each day is its own copy."
//
// The dayType assignment is also per-day (until onboarding lets
// the user set weekly defaults).
// ═══════════════════════════════════════════════════════════

import { T_TPL, R_TPL } from "./data.js";
import { dc } from "./macros.js";

// Day-type catalogue — temporary until onboarding lets the user
// define their own. Matches the legacy training/rest split.
export const DAY_TYPES = [
  {
    id: "gym",
    label: "Gym",
    calMultiplier: 1.087,
    template: T_TPL,
  },
  {
    id: "rest",
    label: "Rest",
    calMultiplier: 0.884,
    template: R_TPL,
  },
];

// ─────────────────────────────────────────────────────────
// Default dayType per weekday (Mon..Sun). User will override.
// Keep simple: Mon/Wed/Fri = Gym, rest = Rest.
// ─────────────────────────────────────────────────────────
const DEFAULT_WEEKLY_PATTERN = ["gym", "rest", "gym", "rest", "gym", "rest", "rest"];

export function defaultDayTypeForWeekday(weekdayIdx /* 0=Mon..6=Sun */) {
  return DEFAULT_WEEKLY_PATTERN[weekdayIdx] ?? "rest";
}

export function getDayType(id) {
  return DAY_TYPES.find((t) => t.id === id) ?? DAY_TYPES[0];
}

// ─────────────────────────────────────────────────────────
// Fresh-day seeding — returns a deep-cloned template copy
// so the day gets its own independent data.
// ─────────────────────────────────────────────────────────
export function seedDay(dayTypeId) {
  const type = getDayType(dayTypeId);
  return dc(type.template);
}

// ─────────────────────────────────────────────────────────
// Helper: Has this day been "touched" yet? (i.e. a copy exists)
// Accepts the raw value read from localStorage — null means
// the user hasn't opened this day yet.
// ─────────────────────────────────────────────────────────
export function isSeeded(dayRecord) {
  return !!(dayRecord && dayRecord.meals);
}
