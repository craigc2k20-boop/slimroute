// ═══════════════════════════════════════════════════════════
// UNIT CONVERSIONS — kg/lbs, ft/cm, in/cm
// Lifted verbatim from legacy app.
// ═══════════════════════════════════════════════════════════

export function ftToCm(ft) {
  const parts = String(ft).split(".");
  const feet = parseInt(parts[0]) || 0;
  const inches = parseInt(parts[1]) || 0;
  return Math.round((feet * 30.48) + (inches * 2.54));
}

export function cmToFtIn(cm) {
  const totalIn = cm / 2.54;
  const ft = Math.floor(totalIn / 12);
  const inn = Math.round(totalIn % 12);
  return `${ft}.${inn}`;
}

export function kgToLbs(kg) {
  return +(parseFloat(kg) * 2.20462).toFixed(1);
}

export function lbsToKg(lbs) {
  return +(parseFloat(lbs) / 2.20462).toFixed(1);
}

export function inToCm(inches) {
  return +(parseFloat(inches) * 2.54).toFixed(1);
}

export function cmToIn(cm) {
  return +(parseFloat(cm) / 2.54).toFixed(1);
}

// Display value in user's chosen unit
export const dispWeight = (kg, unit) => unit === "lbs" ? kgToLbs(kg) : kg;
export const dispHeight = (ftin, unit) => unit === "cm" ? ftToCm(ftin) : ftin;
export const dispWaist = (inches, unit) => unit === "cm" ? inToCm(inches) : inches;

// Parse input back to internal units
export const parseWeight = (val, unit) => unit === "lbs" ? String(lbsToKg(val)) : val;
export const parseHeight = (val, unit) => unit === "cm" ? cmToFtIn(parseFloat(val)) : val;
export const parseWaist = (val, unit) => unit === "cm" ? String(cmToIn(val)) : val;
