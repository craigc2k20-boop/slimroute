// ═══════════════════════════════════════════════════════════
// MacroRing — concentric P/C/F ring with calories in the centre.
// Visual fill caps at 100% (even if macro is over target).
// Over-target shows subtle +XX indicator under the centre label.
// ═══════════════════════════════════════════════════════════

import React from "react";

// Fixed palette — independent of CSS theme tokens, lives in the ring itself
const COLORS = {
  p: "#f97316",   // orange
  c: "#eab308",   // yellow
  f: "#a78bfa",   // purple
  track: "rgba(255,255,255,0.06)",
  centre: "#e2e8f0",
  muted: "#64748b",
  over: "#fbbf24",
};

function arcLength(radius) {
  return 2 * Math.PI * radius;
}

/**
 * Render a single ring. `pct` is 0–100+; visual fill caps at 100%.
 */
function Ring({ cx, cy, r, pct, color, strokeWidth = 10 }) {
  const len = arcLength(r);
  const capped = Math.max(0, Math.min(100, pct));
  const dash = (capped / 100) * len;
  return (
    <>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={COLORS.track} strokeWidth={strokeWidth} />
      <circle
        cx={cx}
        cy={cy}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={strokeWidth}
        strokeDasharray={`${dash} ${len - dash}`}
        strokeLinecap="round"
        transform={`rotate(-90 ${cx} ${cy})`}
      />
    </>
  );
}

/**
 * MacroRing — the main dashboard ring.
 *
 * Props:
 *   totals:   { cals, p, c, f }
 *   targets:  { cals, p, c, f }
 *   size:     pixel size (default 200)
 *   centreLabel?: override the centre small label (default "of target")
 *   onTap?:   fires when the ring is tapped
 *   empty?:   true → render faint rings with "—" in the centre
 */
export default function MacroRing({
  totals = { cals: 0, p: 0, c: 0, f: 0 },
  targets = { cals: 1, p: 1, c: 1, f: 1 },
  size = 200,
  centreLabel,
  onTap,
  empty = false,
}) {
  const cx = size / 2;
  const cy = size / 2;
  // Ring radii — outer (P), middle (C), inner (F)
  const rP = size * 0.44;
  const rC = size * 0.34;
  const rF = size * 0.24;

  const pctP = empty ? 0 : (totals.p / (targets.p || 1)) * 100;
  const pctC = empty ? 0 : (totals.c / (targets.c || 1)) * 100;
  const pctF = empty ? 0 : (totals.f / (targets.f || 1)) * 100;

  const calsOver = !empty && totals.cals > targets.cals;
  const overBy = calsOver ? totals.cals - targets.cals : 0;

  return (
    <svg
      width={size}
      height={size}
      viewBox={`0 0 ${size} ${size}`}
      role={onTap ? "button" : "img"}
      onClick={onTap}
      style={{ cursor: onTap ? "pointer" : "default", display: "block" }}
      aria-label="Macro progress ring"
    >
      <Ring cx={cx} cy={cy} r={rP} pct={pctP} color={COLORS.p} />
      <Ring cx={cx} cy={cy} r={rC} pct={pctC} color={COLORS.c} />
      <Ring cx={cx} cy={cy} r={rF} pct={pctF} color={COLORS.f} />

      {empty ? (
        <>
          <text x={cx} y={cy - 4} textAnchor="middle" fill={COLORS.muted} fontFamily="var(--font-sans)" fontSize={28} fontWeight={500}>—</text>
          <text x={cx} y={cy + 18} textAnchor="middle" fill={COLORS.muted} fontFamily="var(--font-sans)" fontSize={11}>
            No meals yet
          </text>
        </>
      ) : (
        <>
          <text x={cx} y={cy - 2} textAnchor="middle" fill={COLORS.centre} fontFamily="var(--font-sans)" fontSize={28} fontWeight={500}>
            {Math.round(totals.cals).toLocaleString()}
          </text>
          <text x={cx} y={cy + 18} textAnchor="middle" fill={COLORS.muted} fontFamily="var(--font-sans)" fontSize={11}>
            {centreLabel ?? `/ ${Math.round(targets.cals).toLocaleString()} kcal`}
          </text>
          {calsOver && (
            <text x={cx} y={cy + 36} textAnchor="middle" fill={COLORS.over} fontFamily="var(--font-sans)" fontSize={10} fontWeight={600}>
              +{overBy} over
            </text>
          )}
        </>
      )}
    </svg>
  );
}

export { COLORS as RING_COLORS };
