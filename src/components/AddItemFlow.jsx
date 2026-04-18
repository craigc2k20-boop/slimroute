// ═══════════════════════════════════════════════════════════
// AddItemFlow — bottom-sheet overlay for adding an ingredient
// to one of today's meals.
//
// Sheet slides up from the bottom and covers ~75% of the screen.
// The Meals tab stays visible (dimmed) behind it so the user
// keeps spatial context.
//
// Two steps:
//   1. "Add to which meal?" — lists meals not yet completed
//   2. Searchable ingredient picker with a "Recent" row at the top
// ═══════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useRef, useState } from "react";
import { INGS } from "../lib/data.js";
import { gS, gL } from "../lib/date.js";
import { buildIngMap, ingMax } from "../lib/macros.js";
import { useLocalState } from "../hooks/useLocalState.js";

const IM = buildIngMap();
const MAX_RECENTS = 6;

export default function AddItemFlow({ meals, doneIds, onAdd, onClose }) {
  const [step, setStep] = useState("pickMeal");
  const [targetMealId, setTargetMealId] = useState(null);

  const [recentIds, setRecentIds] = useLocalState("recentIngIds", []);

  const availableMeals = meals.filter((m) => !doneIds.includes(m.id));

  const handlePickMeal = (mealId) => {
    setTargetMealId(mealId);
    setStep("pickIngredient");
  };

  const handlePickIngredient = (ingId) => {
    const nextRecents = [ingId, ...recentIds.filter((id) => id !== ingId)].slice(0, MAX_RECENTS);
    setRecentIds(nextRecents);
    onAdd(targetMealId, ingId);
    onClose();
  };

  return (
    <Sheet
      title={step === "pickMeal" ? "Add to which meal?" : "Pick ingredient"}
      onClose={onClose}
      onBack={step === "pickIngredient" ? () => setStep("pickMeal") : null}
    >
      {step === "pickMeal" ? (
        <MealPicker meals={availableMeals} onPick={handlePickMeal} />
      ) : (
        <IngredientPicker recentIds={recentIds} onPick={handlePickIngredient} />
      )}
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════
// Sheet — bottom-sheet container with dim backdrop.
// Content column is capped at 640px to match the main app.
// ═══════════════════════════════════════════════════════════

function Sheet({ title, onClose, onBack, children }) {
  // Lock body scroll while open
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  // Close on Escape
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={title}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 200,
        display: "flex",
        flexDirection: "column",
        justifyContent: "flex-end",
        alignItems: "center",
        // Dim backdrop — tap to close
        background: "rgba(3, 7, 18, 0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
      {/* Sheet body — stops clicks bubbling to backdrop */}
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "100%",
          maxWidth: 640,
          maxHeight: "85vh",
          minHeight: "60vh",
          background: "rgba(15, 23, 42, 0.98)",
          borderTopLeftRadius: 18,
          borderTopRightRadius: 18,
          borderTop: "1px solid rgba(148,163,184,0.12)",
          boxShadow: "0 -8px 40px rgba(0,0,0,0.5)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
          animation: "slimrouteSheetUp 0.22s ease-out",
        }}
      >
        {/* Grab handle */}
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: "rgba(148,163,184,0.3)",
            margin: "8px auto 6px",
          }}
        />

        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            padding: "6px 14px 12px",
            borderBottom: "1px solid rgba(148,163,184,0.08)",
            flexShrink: 0,
          }}
        >
          {onBack ? (
            <button onClick={onBack} aria-label="Back" style={iconBtnStyle}>
              ‹
            </button>
          ) : (
            <div style={{ width: 30 }} />
          )}
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 16,
              color: "var(--text-1)",
              flex: 1,
              margin: 0,
              fontWeight: 700,
            }}
          >
            {title}
          </h2>
          <button onClick={onClose} aria-label="Close" style={iconBtnStyle}>
            ✕
          </button>
        </div>

        {/* Scrollable body */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            WebkitOverflowScrolling: "touch",
            padding: "8px 14px 20px",
          }}
        >
          {children}
        </div>
      </div>

      {/* Slide-up animation via inline <style> — one-off, small */}
      <style>{`
        @keyframes slimrouteSheetUp {
          from { transform: translateY(100%); opacity: 0.6; }
          to   { transform: translateY(0);    opacity: 1; }
        }
      `}</style>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Step 1 — Meal picker
// ═══════════════════════════════════════════════════════════

function MealPicker({ meals, onPick }) {
  if (meals.length === 0) {
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          color: "var(--text-3)",
          fontSize: 13,
        }}
      >
        All meals complete today. Uncheck one first, or create a new meal.
      </div>
    );
  }

  return (
    <div>
      {meals.map((m) => {
        const sectionLabel = gS(m.name);
        const mealLabel = gL(m.name) ?? m.name;
        return (
          <button key={m.id} onClick={() => onPick(m.id)} style={mealRowStyle}>
            <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
              <div
                style={{
                  fontSize: 10,
                  letterSpacing: 1,
                  color: "var(--text-3)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  marginBottom: 2,
                }}
              >
                {sectionLabel} · {m.time}
              </div>
              <div
                style={{
                  fontSize: 14,
                  fontWeight: 700,
                  color: "var(--text-1)",
                }}
              >
                {mealLabel}
              </div>
            </div>
            <span style={{ color: "var(--text-3)", fontSize: 18 }}>›</span>
          </button>
        );
      })}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Step 2 — Ingredient picker (recents + search + list)
// ═══════════════════════════════════════════════════════════

function IngredientPicker({ recentIds, onPick }) {
  const [query, setQuery] = useState("");
  const searchRef = useRef(null);

  useEffect(() => {
    searchRef.current?.focus();
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return INGS;
    return INGS.filter(
      (ing) =>
        ing.food.toLowerCase().includes(q) ||
        ing.cat.toLowerCase().includes(q)
    );
  }, [query]);

  const grouped = useMemo(() => {
    const map = {};
    for (const ing of filtered) {
      const cat = ing.cat || "Other";
      if (!map[cat]) map[cat] = [];
      map[cat].push(ing);
    }
    return map;
  }, [filtered]);

  const recentIngs = useMemo(
    () => recentIds.map((id) => IM[id]).filter(Boolean),
    [recentIds]
  );

  const showRecents = !query.trim() && recentIngs.length > 0;

  return (
    <>
      <div style={{ position: "sticky", top: 0, background: "rgba(15,23,42,0.98)", paddingBottom: 8, marginBottom: 4, zIndex: 1 }}>
        <input
          ref={searchRef}
          type="search"
          placeholder="Search ingredients..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          style={{
            width: "100%",
            padding: "10px 14px",
            background: "rgba(15,23,42,0.8)",
            border: "1px solid rgba(148,163,184,0.15)",
            borderRadius: 10,
            color: "var(--text-1)",
            fontSize: 14,
            fontFamily: "var(--font-sans)",
            outline: "none",
            boxSizing: "border-box",
          }}
        />
      </div>

      {showRecents && (
        <>
          <SectionLabel>Recent</SectionLabel>
          <div>
            {recentIngs.map((ing) => (
              <IngredientRow key={`recent-${ing.id}`} ing={ing} onPick={onPick} />
            ))}
          </div>
          <div style={{ height: 8 }} />
        </>
      )}

      {filtered.length === 0 && (
        <div
          style={{
            padding: "30px 16px",
            textAlign: "center",
            color: "var(--text-3)",
            fontSize: 13,
          }}
        >
          No ingredients match "{query}".
        </div>
      )}

      {Object.entries(grouped).map(([cat, ings]) => (
        <div key={cat} style={{ marginBottom: 6 }}>
          <SectionLabel>{cat}</SectionLabel>
          {ings.map((ing) => (
            <IngredientRow key={ing.id} ing={ing} onPick={onPick} />
          ))}
        </div>
      ))}
    </>
  );
}

function IngredientRow({ ing, onPick }) {
  const unit = ing.unit === "piece" ? "" : "g";
  const per = ing.per100 ?? ing.perUnit ?? {};
  const perLabel = ing.unit === "piece" ? "per piece" : "per 100g";

  return (
    <button onClick={() => onPick(ing.id)} style={ingRowStyle}>
      <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-1)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {ing.food}
        </div>
        <div
          style={{
            fontSize: 10,
            color: "var(--text-3)",
            fontWeight: 600,
            marginTop: 2,
            display: "flex",
            gap: 6,
          }}
        >
          <span>{per.cals ?? 0} kcal {perLabel}</span>
          <span style={{ color: "#60a5fa" }}>{per.p ?? 0}P</span>
          <span style={{ color: "#eab308" }}>{per.c ?? 0}C</span>
          <span style={{ color: "#a78bfa" }}>{per.f ?? 0}F</span>
        </div>
      </div>
      <span
        style={{
          fontSize: 10,
          color: "var(--text-3)",
          fontWeight: 700,
          letterSpacing: 0.4,
          textAlign: "right",
          flexShrink: 0,
          marginLeft: 8,
        }}
      >
        {ing.defAmt}
        {unit} default
      </span>
    </button>
  );
}

function SectionLabel({ children }) {
  return (
    <div
      style={{
        fontSize: 9,
        letterSpacing: 1.2,
        color: "var(--text-3)",
        fontWeight: 700,
        textTransform: "uppercase",
        padding: "8px 4px 5px",
      }}
    >
      {children}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════

const iconBtnStyle = {
  width: 30,
  height: 30,
  borderRadius: 8,
  background: "rgba(30,41,59,0.5)",
  border: "1px solid rgba(148,163,184,0.12)",
  color: "var(--text-2)",
  fontSize: 14,
  fontWeight: 700,
  cursor: "pointer",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  flexShrink: 0,
  fontFamily: "var(--font-sans)",
};

const mealRowStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "12px 14px",
  marginBottom: 6,
  background: "rgba(30,41,59,0.4)",
  border: "1px solid rgba(148,163,184,0.1)",
  borderRadius: 10,
  color: "var(--text-1)",
  fontFamily: "var(--font-sans)",
  cursor: "pointer",
};

const ingRowStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  padding: "9px 12px",
  marginBottom: 3,
  background: "rgba(30,41,59,0.35)",
  border: "1px solid rgba(148,163,184,0.06)",
  borderRadius: 8,
  color: "var(--text-1)",
  fontFamily: "var(--font-sans)",
  cursor: "pointer",
  gap: 8,
};

// ═══════════════════════════════════════════════════════════
// Helper exposed for Meals.jsx
// ═══════════════════════════════════════════════════════════

export function addIngredientToMeal(meals, mealId, ingId) {
  const ing = IM[ingId];
  if (!ing) return meals;
  const defAmt = ing.defAmt ?? (ing.unit === "piece" ? 1 : 100);
  const max = ingMax(ing);

  return meals.map((m) => {
    if (m.id !== mealId) return m;
    const existingIdx = m.items.findIndex((it) => it.ingId === ingId);
    if (existingIdx === -1) {
      return { ...m, items: [...m.items, { ingId, amt: defAmt }] };
    }
    const existing = m.items[existingIdx];
    const newAmt = Math.min(max, existing.amt + defAmt);
    return {
      ...m,
      items: m.items.map((it, i) =>
        i === existingIdx ? { ...it, amt: newAmt } : it
      ),
    };
  });
}
