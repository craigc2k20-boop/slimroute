// ═══════════════════════════════════════════════════════════
// MEAL TIMING — parsing, sorting, chronological shuffle
// Lifted verbatim from legacy app.
// ═══════════════════════════════════════════════════════════

import { FOOTBALL_TIMES } from "./constants.js";
import { dc, sm } from "./macros.js";
import { gS } from "./date.js";

// Parse "8:30 PM" / "12:00 PM" / "9:00 AM" to sortable minutes-since-midnight
export function parseTimeMins(t) {
  if (!t) return 9999;
  const m = t.match(/(\d+):(\d+)\s*(AM|PM)/i);
  if (!m) return 9999;
  let h = parseInt(m[1]);
  const mn = parseInt(m[2]);
  if (m[3].toUpperCase() === "PM" && h !== 12) h += 12;
  else if (m[3].toUpperCase() === "AM" && h === 12) h = 0;
  return h * 60 + mn;
}

// Convert 24h "HH:MM" from <input type="time"> to "H:MM AM/PM"
export function fmtTime24(t) {
  if (!t) return "";
  const [h, m] = t.split(":").map(Number);
  const ampm = h >= 12 ? "PM" : "AM";
  const h12 = h % 12 || 12;
  return `${h12}:${String(m).padStart(2, "0")} ${ampm}`;
}

export function sortMealsByTime(meals) {
  return [...meals].sort((a, b) => parseTimeMins(a.time) - parseTimeMins(b.time));
}

// Assign the highest-calorie non-fixed meal to the metabolically optimal time slot,
// then re-sort all meals chronologically.
// Training day → "8:30 PM" (post-workout anabolic window)
// Rest day     → "12:00 PM" (midday metabolic peak)
// Football day → remap every meal by its template ID via FOOTBALL_TIMES
export function shuffleMealTiming(meals, dayType, im) {
  const isFootball = dayType === "football";
  const isTraining = dayType === "training" || dayType === true; // backward compat with boolean
  if (isFootball) {
    const result = dc(meals);
    result.forEach((m) => { if (FOOTBALL_TIMES[m.id]) m.time = FOOTBALL_TIMES[m.id]; });
    return sortMealsByTime(result);
  }
  let bestIdx = -1, bestCals = -1;
  meals.forEach((meal, i) => {
    if (meal.fixed) return;
    const c = sm(meal, im).cals;
    if (c > bestCals) { bestCals = c; bestIdx = i; }
  });
  if (bestIdx === -1) return sortMealsByTime(meals);
  const result = dc(meals);
  result[bestIdx].time = isTraining ? "8:30 PM" : "12:00 PM";
  return sortMealsByTime(result);
}

// Group meals by section (the part before " — "), preserving order
export function groupSec(meals) {
  const g = [], m = {};
  meals.forEach((ml) => {
    const s = gS(ml.name);
    if (!m[s]) { m[s] = { sec: s, time: ml.time, meals: [] }; g.push(m[s]); }
    m[s].meals.push(ml);
  });
  return g;
}
