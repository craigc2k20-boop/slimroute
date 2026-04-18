// ═══════════════════════════════════════════════════════════
// CONSTANTS — engine tuning, day labels, macro targets, RDAs,
// synergy groupings. Values lifted verbatim from legacy app.
// ═══════════════════════════════════════════════════════════

// Engine tuning
export const MAX_REBALANCE_ITER = 20;
export const FAT_FLOOR_PER_KG = 0.6;
export const TRAINING_MULTIPLIER = 1.087;
export const NON_TRAINING_MULTIPLIER = 0.884;
export const DEBOUNCE_DELAY_MS = 300;

// Day labels
export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
export const DS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

// Macro ceilings
export const PMAX = 190;

// Helper — does this day count as a training day?
export const isTrn = (t) => t === "training" || t === "football";

// Football day meal timing
export const FOOTBALL_TIMES = {
  "lunch": "12:00 PM",      // main protein — 3.5h before gym
  "pregym1": "1:45 PM",     // heavy pre-gym
  "fruit": "2:45 PM",       // simple sugars
  "pregym2": "3:00 PM",     // quick carbs
  "postgym1": "5:15 PM",    // fast recovery
  "postgym2": "6:30 PM",    // sustained protein
  "aft": "1:45 PM",
  "evening": "5:15 PM",
  "supper": "6:30 PM",
};

// Fiber targets
export const FIBER_TARGETS = { total: 30, sol: 10, insol: 15 };
export const PSYLLIUM_FIBER_PER_CAP = 0.5;
export const HYDRATION_PSYLLIUM_BONUS = 300;

// RDA — UK RNI for adult males, tuned for active 40yo 83kg training 4x/week
export const RDA_BASE = { iron: 8.7, calc: 700, zinc: 10.5, fibre: 30, vitC: 75, vitD: 10, b12: 1.5, pot: 3500, mag: 400, om3: 500, selen: 75 };
export const RDA_TRAIN = { ...RDA_BASE, pot: 4100, mag: 470, zinc: 12, vitC: 90 };
export const getRDA = (isTraining) => isTraining ? RDA_TRAIN : RDA_BASE;
export const RDA = RDA_BASE;

export const RDA_LABELS = { iron: "Iron", calc: "Calcium", zinc: "Zinc", fibre: "Fibre", vitC: "Vit C", vitD: "Vit D", b12: "B12", pot: "Potassium", mag: "Magnesium", om3: "Omega-3", selen: "Selenium" };
export const RDA_UNITS = { iron: "mg", calc: "mg", zinc: "mg", fibre: "g", vitC: "mg", vitD: "µg", b12: "µg", pot: "mg", mag: "mg", om3: "mg", selen: "µg" };
export const RDA_TIPS = {
  iron: "beef, beans, spinach, dark chocolate",
  calc: "yogurt, milk, cheese, broccoli",
  zinc: "beef, eggs, chickpeas, oats, dark chocolate",
  fibre: "beans, oats, berries, veg, black beans",
  vitC: "peppers, berries, broccoli, sweet potato",
  vitD: "salmon, eggs — or supplement (10µg/day recommended UK)",
  b12: "meat, eggs, dairy",
  pot: "banana, sweet potato, beans, spinach, dark chocolate",
  mag: "dark chocolate, oats, spinach, peanut butter, black beans",
  om3: "salmon 2x/week, or daily fish oil supplement (1000mg)",
  selen: "eggs, tuna, chicken, mushrooms — or brazil nuts (1-2/day)",
};

// UK 3rd-party tested supplement buy links
export const SUPP_LINKS = {
  iron: { name: "Nutravita Iron", url: "https://www.nutravita.co.uk/collections/daily-vitamins" },
  calc: { name: "Nutravita Calcium", url: "https://www.nutravita.co.uk/collections/daily-vitamins" },
  zinc: { name: "Nutravita Zinc", url: "https://www.nutravita.co.uk/collections/daily-vitamins" },
  vitC: { name: "Nutravita Vitamin C 1000mg", url: "https://www.nutravita.co.uk/collections/daily-vitamins" },
  vitD: { name: "Nutravita Vitamin D3 + K2", url: "https://www.nutravita.co.uk/products/vitamin-d3-with-vitamin-k2-mk7-superblend" },
  b12: { name: "Nutravita Vitamin B12", url: "https://www.nutravita.co.uk/collections/daily-vitamins" },
  pot: { name: "Nutravita Potassium Citrate", url: "https://www.nutravita.co.uk/collections/100-vegan" },
  mag: { name: "Nutravita Magnesium Citrate", url: "https://www.nutravita.co.uk/collections/daily-vitamins" },
  om3: { name: "DoNotAge Pure Omega 3", url: "https://donotage.org/pure-omega-3" },
  selen: { name: "Nutravita Selenium + Zinc", url: "https://www.nutravita.co.uk/collections/daily-vitamins" },
};

// Synergy groupings — used by synCheck to flag interactions within meals
export const HIGH_IRON = ["beef-mince", "baby-spinach", "kidney-beans", "black-beans", "dark-choc", "chickpeas", "turkey-mince"];
export const HIGH_CALCIUM = ["hp-yogurt", "greek-light", "skimmed-milk", "cottage-cheese", "whey"];
export const HIGH_VIT_C = ["peppers", "broccoli", "raspberries", "blueberries", "sp-chips", "baby-spinach"];
export const HIGH_ZINC = ["beef-mince", "whole-egg", "chickpeas", "porridge-oats", "dark-choc", "peanut-butter"];
export const HIGH_FAT_SOL = ["salmon", "whole-egg", "avocado", "butter", "olive-oil", "dark-choc", "peanut-butter"];

export const ADMIN_EMAIL = "craigc2k20@gmail.com";
export const LS_KEY = "eatingPlanSavedState";
