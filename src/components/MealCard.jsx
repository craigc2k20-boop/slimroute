// ═══════════════════════════════════════════════════════════
// MealCard — renders a single meal as a collapsible row.
//
// Phase 1: section label + time, meal name, cal/macro summary,
// expand chevron, checkbox (disabled in Phase 1).
// Phase 2 will make the checkbox live and add status borders.
// Phase 3 will make expand show the ingredient list.
// ═══════════════════════════════════════════════════════════

import React from "react";
import { sm, buildIngMap } from "../lib/macros.js";
import { gS, gL } from "../lib/date.js";

// Build the ingredient map once — it's a pure derivation of the
// static INGS/ING_CONSTRAINTS tables, so it never changes per render.
const IM = buildIngMap();

export default function MealCard({ meal, state = "idle" }) {
  // Compute totals fresh from the meal's items — no stale numbers
  const totals = sm(meal, IM);
  const section = gS(meal.name);
  const mealName = gL(meal.name) ?? meal.name;

  const borderColor =
    state === "done"
      ? "rgba(34,197,94,0.5)"       // green
      : state === "active"
      ? "rgba(251,146,60,0.5)"       // amber
      : "rgba(148,163,184,0.15)";    // idle

  return (
    <div style={{ marginBottom: 12 }}>
      {/* Top meta row: section · time */}
      <div
        style={{
          padding: "0 4px 4px",
          fontSize: 10,
          letterSpacing: 1,
          textTransform: "uppercase",
          color: "var(--text-3)",
          fontWeight: 700,
        }}
      >
        {section} · {meal.time}
      </div>

      {/* Card body */}
      <div
        className="card"
        style={{
          padding: "12px 14px",
          display: "flex",
          alignItems: "center",
          gap: 8,
          border: `1px solid ${borderColor}`,
          transition: "border-color .2s",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              fontSize: 15,
              fontWeight: 700,
              color: "var(--text-1)",
              fontFamily: "var(--font-sans)",
            }}
          >
            {mealName}
          </div>
          <div
            style={{
              fontSize: 11,
              color: "var(--text-3)",
              marginTop: 3,
              fontWeight: 600,
              display: "flex",
              gap: 8,
              alignItems: "baseline",
            }}
          >
            <span style={{ color: "var(--text-2)" }}>{totals.cals} kcal</span>
            <span style={{ color: "#60a5fa" }}>{Math.round(totals.p)}P</span>
            <span style={{ color: "#eab308" }}>{Math.round(totals.c)}C</span>
            <span style={{ color: "#a78bfa" }}>{Math.round(totals.f)}F</span>
          </div>
        </div>
        <div
          style={{
            color: "var(--text-3)",
            fontSize: 11,
            userSelect: "none",
          }}
          aria-hidden
        >
          ▼
        </div>
        <div
          aria-label="Mark meal complete (disabled)"
          title="Checkbox will be active in the next phase"
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            border: "2px solid rgba(71,85,105,0.6)",
            background: "rgba(15,23,42,0.4)",
            opacity: 0.5,
            flexShrink: 0,
          }}
        />
      </div>
    </div>
  );
}
