// ═══════════════════════════════════════════════════════════
// MACRO MATH — calorie/macro computation for ingredients & meals
// Constraint-aware helpers — used by engine and scaling.
// Lifted verbatim from legacy app; signatures unchanged.
// ═══════════════════════════════════════════════════════════

import { INGS, ING_CONSTRAINTS, GI_TYPES } from "./data.js";

// Deep clone (structuredClone is in modern browsers + Node ≥17)
export const dc = (o) => structuredClone(o);

// Build an id → enriched-ingredient map (merges ING_CONSTRAINTS onto each ingredient).
// Consumers pass this map as `im` to every engine function below.
export function buildIngMap(customIngs = []) {
  const all = [...INGS, ...customIngs];
  const map = {};
  all.forEach((ing) => {
    const constraints = ING_CONSTRAINTS[ing.id];
    map[ing.id] = constraints ? { ...ing, constraints } : ing;
  });
  return map;
}

// Constraint-aware bounds
export const ingMin = (ing) =>
  ing.constraints?.limit_range[0] ?? (ing.unit === "piece" ? 1 : (ing.step || 5));
export const ingMax = (ing) => ing.constraints?.limit_range[1] ?? ing.maxAmt ?? 9999;
export const ingDiscrete = (ing) =>
  ing.constraints?.unit_type === "discrete" || ing.unit === "piece";

export const clampAmt = (ing, raw) => {
  const mn = ingMin(ing), mx = ingMax(ing), stp = ing.step || 1;
  return ingDiscrete(ing)
    ? Math.max(mn, Math.min(mx, Math.round(raw)))
    : Math.max(mn, Math.min(mx, Math.round(raw / stp) * stp));
};

// Glycaemic index classification
// Fruit category defaults to simple; everything else defaults to complex.
export const carbGI = (ing) => GI_TYPES[ing?.id] || (ing?.cat === "Fruit" ? "simple" : "complex");

// Classify ingredient by dominant macro role
// Returns 'p' | 'c' | 'f'
export function macroRole(ing) {
  if (!ing) return "c";
  const n = ing.per100 || ing.perUnit || {};
  if (["Protein", "Dairy"].includes(ing.cat)) return "p";
  if (ing.cat === "Fats") return "f";
  if (n.f > n.p && n.f > n.c) return "f";
  return "c";
}

// Calorie/macro totals for a single ingredient at a given amount
export function ci(ing, a) {
  if (!ing) return { cals: 0, p: 0, c: 0, f: 0 };
  if (ing.unit === "piece") {
    const u = ing.perUnit;
    return {
      cals: Math.round(u.cals * a),
      p: +(u.p * a).toFixed(1),
      c: +(u.c * a).toFixed(1),
      f: +(u.f * a).toFixed(1),
    };
  }
  const r = a / 100, u = ing.per100;
  return {
    cals: Math.round(u.cals * r),
    p: +(u.p * r).toFixed(1),
    c: +(u.c * r).toFixed(1),
    f: +(u.f * r).toFixed(1),
  };
}

// Sum a single meal
export function sm(m, im) {
  const t = { cals: 0, p: 0, c: 0, f: 0 };
  m.items.forEach((it) => {
    const s = ci(im[it.ingId], it.amt);
    t.cals += s.cals;
    t.p += s.p;
    t.c += s.c;
    t.f += s.f;
  });
  return t;
}

// Sum all meals
export function sa(ms, im) {
  const t = { cals: 0, p: 0, c: 0, f: 0 };
  ms.forEach((m) => {
    const s = sm(m, im);
    t.cals += s.cals;
    t.p += s.p;
    t.c += s.c;
    t.f += s.f;
  });
  return t;
}
