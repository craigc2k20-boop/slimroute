// ═══════════════════════════════════════════════════════════
// HydrationCard — collapsible card with quick-add drink buttons,
// custom amount input, undo toast, and reset-day option.
//
// Day modes:
//   "future"  → returns null (card hidden)
//   "past"    → read-only: shows progress + total, no controls,
//               no expand chevron. Yesterday also counts as "past"
//               once the 4-hour grace window has closed.
//   "present" → fully interactive (normal behaviour)
// ═══════════════════════════════════════════════════════════

import React, { useState, useEffect } from "react";
import { DRINKS, hydrationValue } from "../lib/hydration.js";

export default function HydrationCard({
  entries = [],
  target = 2700,
  onChange,
  mode = "present", // "past" | "present" | "future"
}) {
  const [expanded, setExpanded] = useState(false);
  const [customMl, setCustomMl] = useState("");
  const [lastUndoable, setLastUndoable] = useState(null);

  // Undo toast auto-dismiss after 4s
  useEffect(() => {
    if (!lastUndoable) return;
    const t = setTimeout(() => setLastUndoable(null), 4000);
    return () => clearTimeout(t);
  }, [lastUndoable]);

  // Future days → hide the card entirely
  if (mode === "future") return null;

  const readOnly = mode === "past";
  const total = entries.reduce((a, e) => a + hydrationValue(e.drink, e.ml), 0);
  const pct = Math.min(100, (total / target) * 100);

  const addDrink = (drinkId, ml) => {
    if (readOnly) return;
    const entry = { drink: drinkId, ml, t: Date.now() };
    const next = [...entries, entry];
    onChange?.(next);
    setLastUndoable(entry);
  };

  const undo = () => {
    if (readOnly || !lastUndoable) return;
    const next = entries.filter((e) => e.t !== lastUndoable.t);
    onChange?.(next);
    setLastUndoable(null);
  };

  const reset = () => {
    if (readOnly) return;
    if (!window.confirm("Reset today's hydration?")) return;
    onChange?.([]);
    setLastUndoable(null);
  };

  const submitCustom = () => {
    const n = parseInt(customMl);
    if (!n || n <= 0) return;
    addDrink("custom", n);
    setCustomMl("");
  };

  // On past days we render the summary but don't let the user expand.
  const canExpand = !readOnly;

  return (
    <div
      className="card"
      style={{
        padding: 0,
        marginBottom: 12,
        overflow: "hidden",
        opacity: readOnly ? 0.85 : 1,
      }}
    >
      {/* Header — tappable only when editable */}
      <button
        onClick={canExpand ? () => setExpanded((v) => !v) : undefined}
        aria-expanded={expanded}
        disabled={!canExpand}
        style={{
          width: "100%",
          background: "transparent",
          border: "none",
          padding: "12px 14px 10px",
          display: "flex",
          alignItems: "center",
          gap: 10,
          cursor: canExpand ? "pointer" : "default",
          color: "var(--text-1)",
          fontFamily: "var(--font-sans)",
        }}
      >
        <HydrationIcon muted={readOnly} />
        <span
          style={{
            fontWeight: 600,
            fontSize: 14,
            color: readOnly ? "var(--text-2)" : "#60a5fa",
          }}
        >
          Hydration
          {readOnly && (
            <span
              style={{
                fontSize: 10,
                letterSpacing: 0.5,
                marginLeft: 7,
                padding: "1px 6px",
                background: "rgba(148,163,184,0.12)",
                color: "var(--text-3)",
                borderRadius: 10,
                textTransform: "uppercase",
                fontWeight: 700,
                verticalAlign: "middle",
              }}
            >
              Locked
            </span>
          )}
        </span>
        <span style={{ flex: 1 }} />
        <span style={{ fontSize: 13, fontWeight: 600 }}>
          <span style={{ color: total >= target ? "#22c55e" : "#fbbf24" }}>
            {total}ml
          </span>
          <span style={{ color: "var(--text-3)" }}> / {target}ml</span>
        </span>
        {canExpand && (
          <span
            style={{
              color: "var(--text-2)",
              fontSize: 11,
              transform: expanded ? "rotate(180deg)" : "none",
              transition: "transform .15s",
            }}
          >
            ▼
          </span>
        )}
      </button>

      {/* Progress bar — always visible */}
      <div
        style={{
          height: 4,
          background: "rgba(148,163,184,0.12)",
          margin: "0 14px",
          borderRadius: 2,
          overflow: "hidden",
          marginBottom: readOnly ? 12 : 0,
        }}
      >
        <div
          style={{
            width: `${pct}%`,
            height: "100%",
            background: total >= target
              ? "linear-gradient(90deg,#22c55e,#4ade80)"
              : "linear-gradient(90deg,#0ea5e9,#38bdf8)",
            transition: "width .3s ease",
          }}
        />
      </div>

      {/* Expanded body — only in present mode */}
      {expanded && !readOnly && (
        <div style={{ padding: "12px 14px 14px" }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 6,
              marginBottom: 10,
            }}
          >
            {DRINKS.map((d) => (
              <button
                key={d.id}
                onClick={() => addDrink(d.id, d.ml)}
                style={quickBtnStyle}
                title={`${d.label} — ${d.ml}ml`}
              >
                <span style={{ fontSize: 18 }}>{d.icon}</span>
                <span style={{ fontSize: 10, fontWeight: 600 }}>{d.ml}ml</span>
              </button>
            ))}
          </div>

          {/* Custom input */}
          <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
            <input
              type="number"
              placeholder="Custom ml"
              value={customMl}
              onChange={(e) => setCustomMl(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && submitCustom()}
              style={{
                flex: 1,
                background: "rgba(15,23,42,0.5)",
                border: "1px solid rgba(148,163,184,0.12)",
                borderRadius: 7,
                padding: "7px 9px",
                color: "var(--text-1)",
                fontSize: 12,
                fontFamily: "var(--font-sans)",
              }}
            />
            <button
              onClick={submitCustom}
              style={{ ...quickBtnStyle, padding: "7px 14px", minHeight: 0, flexDirection: "row", gap: 4 }}
            >
              <span style={{ fontSize: 14 }}>➕</span>
              <span style={{ fontSize: 10, fontWeight: 600 }}>Add</span>
            </button>
          </div>

          {/* Footer — undo + reset */}
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              marginTop: 10,
              minHeight: 18,
            }}
          >
            {lastUndoable ? (
              <button onClick={undo} style={linkBtnStyle}>
                ↶ Undo last add
              </button>
            ) : (
              <span />
            )}
            {entries.length > 0 && (
              <button onClick={reset} style={linkBtnStyle}>
                Reset today
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Styles & helpers
// ─────────────────────────────────────────────────────────

const quickBtnStyle = {
  background: "rgba(30,41,59,0.5)",
  border: "1px solid rgba(148,163,184,0.12)",
  borderRadius: 8,
  padding: "8px 4px",
  display: "flex",
  flexDirection: "column",
  alignItems: "center",
  gap: 2,
  cursor: "pointer",
  color: "var(--text-1)",
  fontFamily: "var(--font-sans)",
  minHeight: 56,
};

const linkBtnStyle = {
  background: "transparent",
  border: "none",
  color: "var(--text-2)",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  padding: "2px 4px",
  fontFamily: "var(--font-sans)",
};

function HydrationIcon({ muted }) {
  const stroke = muted ? "#64748b" : "#60a5fa";
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke={stroke}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
    </svg>
  );
}
