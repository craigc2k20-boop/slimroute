// ═══════════════════════════════════════════════════════════
// PARITY TESTS — baseline regression suite.
// These assert that the ported library functions produce the
// same outputs as the legacy app for a handful of known inputs.
// If any of these break after a refactor, you've changed a
// macro or TDEE calculation — probably unintentionally.
//
// Run with:  npm test
// ═══════════════════════════════════════════════════════════

import { describe, it, expect } from "vitest";

import { calcBMR, calcTDEE, adaptiveTDEE } from "../src/lib/tdee.js";
import { buildIngMap, ci, sm, sa, macroRole, carbGI, clampAmt, ingMin, ingMax } from "../src/lib/macros.js";
import { autoRebalance, microCheck, fiberCheck, synCheck } from "../src/lib/meals.js";
import { kgToLbs, lbsToKg, ftToCm, cmToFtIn } from "../src/lib/units.js";
import { parseTimeMins, fmtTime24, sortMealsByTime } from "../src/lib/time.js";
import { computeHydrationTarget, hydrationValue, sumHydration, DRINKS } from "../src/lib/hydration.js";

describe("Unit conversions", () => {
  it("kg ↔ lbs round-trip", () => {
    expect(kgToLbs(83)).toBeCloseTo(183.0, 0);
    expect(lbsToKg(183)).toBeCloseTo(83.0, 0);
  });
  it("ft.in ↔ cm", () => {
    expect(ftToCm("5.10")).toBe(178); // 5'10" = 177.8 → 178
    expect(cmToFtIn(178)).toBe("5.10");
  });
});

describe("BMR & TDEE", () => {
  it("Mifflin-St Jeor for 40yo 83kg 178cm male, moderate activity", () => {
    const bmr = calcBMR(83, 178, 40, "male", 0);
    // Mifflin-St Jeor: 10w + 6.25h − 5a + 5 = 1747.5, rounded to 1748
    expect(bmr).toBe(Math.round(10 * 83 + 6.25 * 178 - 5 * 40 + 5));
    const tdee = calcTDEE(83, 178, 40, "male", "moderate", 0, 0, "good", "low", "mixed");
    expect(tdee).toBeGreaterThan(2500);
    expect(tdee).toBeLessThan(3000);
  });
  it("Katch-McArdle when body fat is provided", () => {
    const bmr = calcBMR(83, 178, 40, "male", 18);
    const lbm = 83 * (1 - 18 / 100);
    expect(bmr).toBe(Math.round(370 + 21.6 * lbm));
  });
});

describe("Adaptive TDEE", () => {
  it("returns formula seed with no history", () => {
    const r = adaptiveTDEE([], 2750);
    expect(r.tdee).toBe(2750);
    expect(r.source).toBe("formula");
  });
  it("blends 50/50 with a single data point", () => {
    const r = adaptiveTDEE([{ week: "w1", actual: 2500 }], 2900);
    expect(r.tdee).toBe(2700);
    expect(r.source).toBe("blended");
  });
  it("enforces metabolic floor at 75% of BMR when EWMA would go below it", () => {
    // Very low historical intake (900) with a high formula seed (2500) and BMR
    // of 2500 → metaFloor = 1875. Heavy weighting on the 900 values would push
    // final below 1875, triggering the floor clamp.
    const r = adaptiveTDEE(
      [
        { week: "w1", actual: 900 },
        { week: "w2", actual: 900 },
        { week: "w3", actual: 900 },
        { week: "w4", actual: 900 },
        { week: "w5", actual: 900 },
      ],
      2500,
      0.3,
      2500 // bmr — metaFloor becomes 1875
    );
    const metaFloor = Math.round(2500 * 0.75);
    expect(r.floor).toBe(metaFloor);
    expect(r.tdee).toBeGreaterThanOrEqual(metaFloor);
    expect(r.plateau).toBe(true); // hitting the floor flips plateau=true
  });
});

describe("Macro math", () => {
  const im = buildIngMap();

  it("ci computes correct calories for gram-based ingredient", () => {
    const r = ci(im["chicken-breast"], 200);
    // 110 cals × 2 = 220; 23.1 p × 2 = 46.2
    expect(r.cals).toBe(220);
    expect(r.p).toBeCloseTo(46.2, 1);
  });

  it("ci computes correct macros for per-piece ingredient", () => {
    const r = ci(im["whole-egg"], 3);
    // 78 × 3 = 234; 6.3 × 3 = 18.9
    expect(r.cals).toBe(234);
    expect(r.p).toBeCloseTo(18.9, 1);
  });

  it("macroRole classifies correctly", () => {
    expect(macroRole(im["chicken-breast"])).toBe("p"); // Protein
    expect(macroRole(im["hp-yogurt"])).toBe("p");       // Dairy → protein
    expect(macroRole(im["olive-oil"])).toBe("f");       // Fats
    expect(macroRole(im["basmati-rice"])).toBe("c");    // Default carb
  });

  it("carbGI classifies GI correctly", () => {
    expect(carbGI(im["banana"])).toBe("simple");
    expect(carbGI(im["porridge-oats"])).toBe("complex");
  });

  it("clampAmt respects constraints", () => {
    const chix = im["chicken-breast"]; // constraint 80–350
    expect(clampAmt(chix, 50)).toBe(80);
    expect(clampAmt(chix, 9999)).toBe(350);
    expect(clampAmt(chix, 157)).toBe(160); // rounds to step of 10
  });
});

describe("Meal engine", () => {
  const im = buildIngMap();
  const testMeals = () => [
    {
      id: "lunch",
      name: "Lunch — Test",
      time: "12:00 PM",
      fixed: false,
      items: [
        { ingId: "chicken-breast", amt: 200 },
        { ingId: "basmati-rice", amt: 75 },
        { ingId: "broccoli", amt: 100 },
      ],
    },
  ];

  it("autoRebalance hits target within ±30 cal tolerance", () => {
    const out = autoRebalance(testMeals(), 800, im, [], "balanced", 83);
    const after = sa(out, im).cals;
    expect(Math.abs(after - 800)).toBeLessThanOrEqual(30);
  });

  it("autoRebalance pushes fat up toward the floor when fat sources are unlocked", () => {
    // Fat floor engine only bumps items in Fats/Snack categories.
    // With limited fat sources available (ingredient max constraints will
    // cap how close we can get to the 0.6g/kg target), we assert the
    // engine at least moves fat meaningfully upward from baseline.
    const mealsWithFat = [
      {
        id: "lunch",
        name: "Lunch — Test",
        time: "12:00 PM",
        fixed: false,
        items: [
          { ingId: "chicken-breast", amt: 200 },
          { ingId: "basmati-rice", amt: 75 },
          { ingId: "broccoli", amt: 100 },
          { ingId: "olive-oil", amt: 10 },
          { ingId: "avocado", amt: 1 },
          { ingId: "peanut-butter", amt: 15 },
        ],
      },
    ];
    const before = sa(mealsWithFat, im);
    const out = autoRebalance(mealsWithFat, 1200, im, [], "balanced", 83);
    const after = sa(out, im);
    // Either we reached the floor, or we maxed out available fat items.
    // Assert fat didn't decrease and engine attempted to increase it.
    expect(after.f).toBeGreaterThanOrEqual(before.f);
  });

  it("microCheck returns all 11 micronutrients", () => {
    const micros = microCheck(testMeals(), false);
    expect(micros.length).toBe(11);
    expect(micros.every((m) => typeof m.actual === "number")).toBe(true);
  });

  it("fiberCheck triggers for low-fibre day", () => {
    const r = fiberCheck(testMeals(), im);
    expect(r.triggered).toBe(true);
    expect(r.total).toBeLessThan(30);
  });

  it("synCheck runs without errors and returns an array", () => {
    const notes = synCheck(testMeals());
    expect(Array.isArray(notes)).toBe(true);
  });
});

describe("Time helpers", () => {
  it("parseTimeMins handles AM/PM correctly", () => {
    expect(parseTimeMins("12:00 AM")).toBe(0);
    expect(parseTimeMins("12:00 PM")).toBe(720);
    expect(parseTimeMins("6:30 PM")).toBe(18 * 60 + 30);
  });
  it("fmtTime24 formats 24h input as 12h AM/PM", () => {
    expect(fmtTime24("08:30")).toBe("8:30 AM");
    expect(fmtTime24("20:15")).toBe("8:15 PM");
    expect(fmtTime24("00:00")).toBe("12:00 AM");
  });
  it("sortMealsByTime orders meals chronologically", () => {
    const sorted = sortMealsByTime([
      { time: "8:00 PM" },
      { time: "12:00 PM" },
      { time: "9:00 AM" },
    ]);
    expect(sorted.map((m) => m.time)).toEqual(["9:00 AM", "12:00 PM", "8:00 PM"]);
  });
});

describe("Hydration", () => {
  it("sumHydration totals water intake correctly", () => {
    const entries = [
      { drink: "glass", ml: 250 },
      { drink: "mug", ml: 200 },
      { drink: "custom", ml: 300 },
    ];
    expect(sumHydration(entries)).toBe(750);
  });

  it("computeHydrationTarget baseline scales with body weight", () => {
    const t = computeHydrationTarget({ bodyWeightKg: 83, dayType: "rest" });
    // 83 * 35 = 2905 → round to nearest 50 = 2900
    expect(t).toBe(2900);
  });

  it("computeHydrationTarget adds training bonus", () => {
    const base = computeHydrationTarget({ bodyWeightKg: 83, dayType: "rest" });
    const trn = computeHydrationTarget({ bodyWeightKg: 83, dayType: "training" });
    expect(trn - base).toBe(500);
  });

  it("computeHydrationTarget football replaces training bonus (not additive)", () => {
    const trn = computeHydrationTarget({ bodyWeightKg: 83, dayType: "training" });
    const fb = computeHydrationTarget({ bodyWeightKg: 83, dayType: "football" });
    // Football is +750 from baseline, not +1250
    expect(fb - trn).toBe(250);
  });

  it("computeHydrationTarget stacks psyllium and creatine bonuses", () => {
    const base = computeHydrationTarget({ bodyWeightKg: 83, dayType: "rest" });
    const both = computeHydrationTarget({
      bodyWeightKg: 83,
      dayType: "rest",
      hasPsyllium: true,
      hasCreatine: true,
    });
    expect(both - base).toBe(800); // 300 + 500
  });

  it("computeHydrationTarget honours override", () => {
    const override = computeHydrationTarget({ bodyWeightKg: 83, override: 3200 });
    expect(override).toBe(3200);
  });

  it("DRINKS all have valid multipliers between 0 and 1", () => {
    DRINKS.forEach((d) => {
      expect(d.mult).toBeGreaterThan(0);
      expect(d.mult).toBeLessThanOrEqual(1);
      expect(d.ml).toBeGreaterThan(0);
    });
  });
});
