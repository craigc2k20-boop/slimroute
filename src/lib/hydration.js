// ═══════════════════════════════════════════════════════════
// HYDRATION — daily target formula, drink presets, math
// All hydration calculations live here so tuning a number
// (e.g. coffee multiplier) doesn't require touching the UI.
// ═══════════════════════════════════════════════════════════

/**
 * Drink presets — each has an id, display label, default volume in ml,
 * and a hydration multiplier (what fraction of its ml count toward
 * your daily total). Pure water = 1.0. Adjust later if research
 * justifies different numbers.
 */
export const DRINKS = [
  { id: "glass", label: "Glass", ml: 250, mult: 1.0, icon: "🥛" },
  { id: "mug", label: "Coffee / Mug", ml: 200, mult: 1.0, icon: "☕" },
  { id: "pint", label: "Pint", ml: 568, mult: 1.0, icon: "🍺" },
  { id: "bottle", label: "Bottle", ml: 500, mult: 1.0, icon: "💧" },
  // "custom" is handled separately in the UI — see HydrationCard.
];

/**
 * hydrationValue — returns how many ml actually count toward the
 * daily total for a given drink entry.
 *
 * @param {string} drinkId  — one of DRINKS ids, or "custom"
 * @param {number} ml       — raw volume in millilitres
 * @returns {number}        — hydrating ml, rounded
 */
export function hydrationValue(drinkId, ml) {
  if (!ml || ml <= 0) return 0;
  if (drinkId === "custom") return Math.round(ml); // user-entered, assume water
  const d = DRINKS.find((x) => x.id === drinkId);
  const mult = d ? d.mult : 1.0;
  return Math.round(ml * mult);
}

/**
 * Sum an array of entries [{drink, ml, t}] and return total hydrating ml.
 */
export function sumHydration(entries = []) {
  return entries.reduce((acc, e) => acc + hydrationValue(e.drink, e.ml), 0);
}

// ═══════════════════════════════════════════════════════════
// DAILY TARGET FORMULA
// baseline   = bodyWeight_kg × 35 ml      (NHS / EFSA-inspired baseline)
// training   = +500 ml                    (training or football day)
// football   = +250 ml on top of training  (total +750)
// psyllium   = +300 ml (it needs water to work, otherwise constipates)
// creatine   = +500 ml (creatine draws water into muscle cells)
// ═══════════════════════════════════════════════════════════

export const HYDRATION_COEFFS = {
  ML_PER_KG: 35,
  TRAINING_BONUS: 500,
  FOOTBALL_BONUS: 750, // replaces training bonus, not additive
  PSYLLIUM_BONUS: 300,
  CREATINE_BONUS: 500,
};

/**
 * computeHydrationTarget — returns the daily target ml for a user.
 *
 * @param {object} opts
 * @param {number} opts.bodyWeightKg  — kg, defaults to 83 (legacy default)
 * @param {string} opts.dayType       — "training" | "football" | "rest"
 * @param {boolean} opts.hasPsyllium  — today's plan includes psyllium caps
 * @param {boolean} opts.hasCreatine  — today's supplements include creatine
 * @param {number|null} opts.override — user-set override from profile; if a
 *                                      positive number is provided we return
 *                                      that instead (rounded to nearest 50)
 * @returns {number} daily target in ml, rounded to nearest 50
 */
export function computeHydrationTarget({
  bodyWeightKg = 83,
  dayType = "rest",
  hasPsyllium = false,
  hasCreatine = false,
  override = null,
} = {}) {
  if (typeof override === "number" && override > 0) {
    return Math.round(override / 50) * 50;
  }
  let total = bodyWeightKg * HYDRATION_COEFFS.ML_PER_KG;
  if (dayType === "football") total += HYDRATION_COEFFS.FOOTBALL_BONUS;
  else if (dayType === "training") total += HYDRATION_COEFFS.TRAINING_BONUS;
  if (hasPsyllium) total += HYDRATION_COEFFS.PSYLLIUM_BONUS;
  if (hasCreatine) total += HYDRATION_COEFFS.CREATINE_BONUS;
  return Math.round(total / 50) * 50; // nearest 50ml
}
