// ═══════════════════════════════════════════════════════════
// TDEE & BMR — Katch-McArdle (if BF%) or Mifflin-St Jeor,
// with lifestyle adjustments. Lifted verbatim from legacy app.
// ═══════════════════════════════════════════════════════════

export function calcBMR(weight, heightCm, age, gender, bodyFat) {
  if (bodyFat > 0) {
    const lbm = weight * (1 - bodyFat / 100);
    return Math.round(370 + (21.6 * lbm));
  }
  return Math.round(
    gender === "male"
      ? (10 * weight + 6.25 * heightCm - 5 * age + 5)
      : (10 * weight + 6.25 * heightCm - 5 * age - 161)
  );
}

export function calcTDEE(weight, heightCm, age, gender, activity, bodyFat, waist, sleep, stress, job) {
  let bmr;
  if (bodyFat > 0) {
    // Katch-McArdle — more accurate with body fat
    const lbm = weight * (1 - bodyFat / 100);
    bmr = 370 + (21.6 * lbm);
  } else {
    // Mifflin-St Jeor
    bmr = gender === "male"
      ? (10 * weight + 6.25 * heightCm - 5 * age + 5)
      : (10 * weight + 6.25 * heightCm - 5 * age - 161);
  }
  // Activity multiplier
  const mult = { sedentary: 1.2, light: 1.375, moderate: 1.55, active: 1.725, very: 1.9 };
  let tdee = bmr * (mult[activity] || 1.55);
  // Waist adjustment — higher waist:height ratio suggests higher body fat
  if (waist > 0 && heightCm > 0) {
    const whr = (waist * 2.54) / heightCm;
    if (whr > 0.53) tdee *= 0.97;
    if (whr > 0.58) tdee *= 0.95;
  }
  // Sleep adjustment — poor sleep reduces metabolism
  if (sleep === "poor") tdee *= 0.95;
  else if (sleep === "fair") tdee *= 0.98;
  // Stress — high cortisol increases fat storage, reduce surplus
  if (stress === "high") tdee *= 0.97;
  // Desk job penalty
  if (job === "desk") tdee *= 0.97;
  else if (job === "mixed") tdee *= 1.0;
  else if (job === "active") tdee *= 1.05;
  return Math.round(tdee);
}

// ═══════════════════════════════════════════════════════════
// ADAPTIVE TDEE — Closed-Loop Metabolic Controller
// Treats formula TDEE as an initial seed, then recursively
// corrects using real-world weight telemetry each cycle.
// Exponentially-weighted moving average with recency bias
// (α = 0.3 means recent weeks are ~3× more important).
// ═══════════════════════════════════════════════════════════
export function adaptiveTDEE(history, formulaSeed, alpha = 0.3, bmr = 0) {
  const base = { tdee: formulaSeed, confidence: 0, source: "formula", correction: 0, trend: [], plateau: false, floor: 0 };
  if (!history || !history.length) return base;
  const valid = history.filter((h) => h.actual > 800 && h.actual < 5000);
  if (!valid.length) return base;

  // Metabolic floor = 75% of BMR — never suggest below this
  const metaFloor = bmr > 0 ? Math.round(bmr * 0.75) : 0;

  if (valid.length === 1) {
    let blend = Math.round((formulaSeed + valid[0].actual) / 2);
    const hitFloor = metaFloor > 0 && blend < metaFloor;
    if (hitFloor) blend = metaFloor;
    return {
      tdee: blend,
      confidence: 25,
      source: "blended",
      correction: blend - formulaSeed,
      trend: [{ w: valid[0].week, v: valid[0].actual }],
      plateau: hitFloor,
      floor: metaFloor,
      dataPoints: 1,
    };
  }

  // EWMA
  let wSum = 0, wTotal = 0;
  for (let i = valid.length - 1; i >= 0; i--) {
    const age = valid.length - 1 - i;
    const w = Math.pow(1 - alpha, age);
    wSum += valid[i].actual * w;
    wTotal += w;
  }
  const ewma = Math.round(wSum / wTotal);
  const conf = Math.min(95, Math.round(95 * (1 - Math.exp(-0.4 * valid.length))));
  const formulaW = Math.max(0, (100 - conf) / 100);
  const dataW = 1 - formulaW;
  let final = Math.round(ewma * dataW + formulaSeed * formulaW);

  // Plateau detection — if EWMA is trending down but last 3 weeks show <0.1kg loss
  // despite a deficit, it's likely water retention or metabolic adaptation
  let plateauDetected = false;
  if (valid.length >= 3) {
    const last3 = valid.slice(-3);
    const avgChange = last3.reduce((s, h) => s + (h.change || 0), 0) / 3;
    const avgDeficit = last3.reduce((s, h) => s + (h.predicted - h.avgCal), 0) / 3;
    if (avgDeficit > 100 && Math.abs(avgChange) < 0.1) plateauDetected = true;
  }

  // Enforce metabolic floor
  const hitFloor = metaFloor > 0 && final < metaFloor;
  if (hitFloor) {
    final = metaFloor;
    plateauDetected = true;
  }

  const trend = valid.map((h) => ({ w: h.week, v: h.actual }));
  const mean = valid.reduce((s, h) => s + h.actual, 0) / valid.length;
  const variance = Math.round(Math.sqrt(valid.reduce((s, h) => s + Math.pow(h.actual - mean, 2), 0) / valid.length));

  return {
    tdee: final,
    ewma,
    confidence: conf,
    source: conf >= 60 ? "adaptive" : "blended",
    correction: final - formulaSeed,
    variance,
    trend,
    dataPoints: valid.length,
    plateau: plateauDetected,
    floor: metaFloor,
  };
}
