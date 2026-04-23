// ═══════════════════════════════════════════════════════════
// AddItemFlow — bottom-sheet overlay for adding an ingredient.
//
// Step 1 shows two groups:
//
//   ADD TO EXISTING MEAL
//     ├─ lists each meal card
//     └─ picked ingredient gets added to that meal
//
//   ADD AS NEW MEAL
//     ├─ lists unique sections (e.g. Fruit 5:30 PM, Pre-Gym 2 6:00 PM)
//     └─ picked ingredient becomes a brand-new standalone meal in
//        that section, auto-named after the ingredient (single-item
//        meals get their display name from the first ingredient —
//        see MealCard).
//
// Step 2 is the searchable ingredient picker — same as before.
// ═══════════════════════════════════════════════════════════

import React, { useEffect, useMemo, useRef, useState } from "react";
import { INGS } from "../lib/data.js";
import { gS, gL } from "../lib/date.js";
import { buildIngMap, ingMax } from "../lib/macros.js";
import { useLocalState } from "../hooks/useLocalState.js";

const IM = buildIngMap();
const MAX_RECENTS = 6;

export default function AddItemFlow({ meals, doneIds, onAdd, onAddNewMeal, onClose }) {
  const [step, setStep] = useState("pickTarget"); // "pickTarget" | "pickIngredient"
  const [target, setTarget] = useState(null); // { kind: "meal", mealId } | { kind: "section", section, time }

  const [recentIds, setRecentIds] = useLocalState("recentIngIds", []);

  const availableMeals = meals.filter((m) => !doneIds.includes(m.id));

  // Derive unique sections from the meals. A "section" is the part of
  // the meal name before " — " plus the meal's time. Same section name
  // at a different time counts as two sections.
  const sections = useMemo(() => {
    const seen = new Map();
    for (const m of meals) {
      const sec = gS(m.name);
      const key = `${sec}|${m.time}`;
      if (!seen.has(key)) seen.set(key, { section: sec, time: m.time });
    }
    return [...seen.values()];
  }, [meals]);

  const handlePickTarget = (t) => {
    setTarget(t);
    setStep("pickIngredient");
  };

  const handlePickIngredient = (ingId) => {
    const nextRecents = [ingId, ...recentIds.filter((id) => id !== ingId)].slice(0, MAX_RECENTS);
    setRecentIds(nextRecents);
    if (target.kind === "meal") {
      onAdd(target.mealId, ingId);
    } else {
      onAddNewMeal(target.section, target.time, ingId);
    }
    onClose();
  };

  return (
    <Sheet
      title={step === "pickTarget" ? "Add item" : "Pick ingredient"}
      onClose={onClose}
      onBack={step === "pickIngredient" ? () => setStep("pickTarget") : null}
    >
      {step === "pickTarget" ? (
        <TargetPicker
          meals={availableMeals}
          sections={sections}
          onPick={handlePickTarget}
        />
      ) : (
        <IngredientPicker recentIds={recentIds} onPick={handlePickIngredient} />
      )}
    </Sheet>
  );
}

// ═══════════════════════════════════════════════════════════
// Sheet — bottom-sheet container with dim backdrop
// ═══════════════════════════════════════════════════════════

function Sheet({ title, onClose, onBack, children }) {
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

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
        background: "rgba(3, 7, 18, 0.55)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
      }}
      onClick={onClose}
    >
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
        <div
          style={{
            width: 36,
            height: 4,
            borderRadius: 2,
            background: "rgba(148,163,184,0.3)",
            margin: "8px auto 6px",
          }}
        />

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
            <button onClick={onBack} aria-label="Back" style={iconBtnStyle}>‹</button>
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
          <button onClick={onClose} aria-label="Close" style={iconBtnStyle}>✕</button>
        </div>

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
// Step 1 — Target picker: existing meal OR new meal under section
// ═══════════════════════════════════════════════════════════

function TargetPicker({ meals, sections, onPick }) {
  const hasMeals = meals.length > 0;
  const hasSections = sections.length > 0;

  if (!hasMeals && !hasSections) {
    return (
      <div
        style={{
          padding: "40px 20px",
          textAlign: "center",
          color: "var(--text-3)",
          fontSize: 13,
        }}
      >
        No meal sections yet. Use "Add a new meal section" below to create one first.
      </div>
    );
  }

  return (
    <div>
      {/* ADD TO EXISTING MEAL */}
      {hasMeals && (
        <div style={{ marginBottom: 14 }}>
          <GroupLabel
            title="Add to existing meal"
            subtitle="The ingredient becomes part of a meal you already have."
          />
          {meals.map((m) => {
            const sectionLabel = gS(m.name);
            const mealLabel = gL(m.name) ?? inferSoloName(m) ?? "Untitled meal";
            return (
              <button
                key={m.id}
                onClick={() => onPick({ kind: "meal", mealId: m.id })}
                style={rowStyle}
              >
                <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                  <div style={rowMetaStyle}>
                    {sectionLabel} · {m.time}
                  </div>
                  <div style={rowTitleStyle}>{mealLabel}</div>
                </div>
                <span style={chevronStyle}>›</span>
              </button>
            );
          })}
        </div>
      )}

      {/* ADD AS NEW MEAL */}
      {hasSections && (
        <div>
          <GroupLabel
            title="Add as new meal"
            subtitle="The ingredient becomes its own standalone meal under the section you pick."
          />
          {sections.map((s) => (
            <button
              key={`${s.section}|${s.time}`}
              onClick={() => onPick({ kind: "section", section: s.section, time: s.time })}
              style={rowStyle}
            >
              <div style={{ flex: 1, textAlign: "left", minWidth: 0 }}>
                <div style={rowMetaStyle}>
                  {s.section} · {s.time}
                </div>
                <div style={{ ...rowTitleStyle, color: "var(--text-2)", fontStyle: "italic" }}>
                  New standalone meal
                </div>
              </div>
              <span style={chevronStyle}>+</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// Fallback display-name helper so meal-picker rows match what the
// MealCard ultimately shows: solo-ingredient meals show the ingredient name.
function inferSoloName(meal) {
  if (meal.items.length !== 1) return null;
  if (meal.userNamed) return null;
  const ing = IM[meal.items[0].ingId];
  return ing?.food ?? null;
}

function GroupLabel({ title, subtitle }) {
  return (
    <div style={{ padding: "4px 4px 8px" }}>
      <div
        style={{
          fontSize: 10,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: "#93c5fd",
          fontWeight: 800,
        }}
      >
        {title}
      </div>
      {subtitle && (
        <div
          style={{
            fontSize: 11,
            color: "var(--text-3)",
            marginTop: 2,
            lineHeight: 1.4,
          }}
        >
          {subtitle}
        </div>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Step 2 — Ingredient picker (unchanged from last build)
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
          <MiniSectionLabel>Recent</MiniSectionLabel>
          <div>
            {recentIngs.map((ing) => (
              <IngredientRow key={`recent-${ing.id}`} ing={ing} onPick={onPick} />
            ))}
          </div>
          <div style={{ height: 8 }} />
        </>
      )}

      {filtered.length === 0 && (
        <div style={{ padding: "30px 16px", textAlign: "center", color: "var(--text-3)", fontSize: 13 }}>
          No ingredients match "{query}".
        </div>
      )}

      {Object.entries(grouped).map(([cat, ings]) => (
        <div key={cat} style={{ marginBottom: 6 }}>
          <MiniSectionLabel>{cat}</MiniSectionLabel>
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
    <button onClick={() => onPick(ing.id)} style={rowStyle}>
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

function MiniSectionLabel({ children }) {
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
// Shared styles
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

const rowStyle = {
  width: "100%",
  display: "flex",
  alignItems: "center",
  gap: 10,
  padding: "10px 12px",
  marginBottom: 5,
  background: "rgba(30,41,59,0.4)",
  border: "1px solid rgba(148,163,184,0.1)",
  borderRadius: 10,
  color: "var(--text-1)",
  fontFamily: "var(--font-sans)",
  cursor: "pointer",
};

const rowMetaStyle = {
  fontSize: 10,
  letterSpacing: 1,
  color: "var(--text-3)",
  fontWeight: 700,
  textTransform: "uppercase",
  marginBottom: 2,
};

const rowTitleStyle = {
  fontSize: 14,
  fontWeight: 700,
  color: "var(--text-1)",
};

const chevronStyle = {
  color: "var(--text-3)",
  fontSize: 18,
  flexShrink: 0,
};

// ═══════════════════════════════════════════════════════════
// Helpers used by Meals.jsx
// ═══════════════════════════════════════════════════════════

/**
 * Add an ingredient to an existing meal. Merges amounts if the
 * ingredient is already present, otherwise appends a new row.
 */
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

/**
 * Create a new standalone meal in a section.
 * The meal has exactly one ingredient (at defAmt), no user-set name,
 * so MealCard's single-ingredient auto-naming will show the ingredient's
 * food name as the card title.
 *
 * New meals are inserted right after the last existing meal in the same
 * section, keeping section grouping visually intact.
 */
export function addNewMealToSection(meals, section, time, ingId) {
  const ing = IM[ingId];
  if (!ing) return meals;
  const defAmt = ing.defAmt ?? (ing.unit === "piece" ? 1 : 100);

  const newMeal = {
    id: `meal-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    name: section, // bare section name — meal has no custom name; autoNaming kicks in
    time,
    fixed: false,
    userNamed: false,
    items: [{ ingId, amt: defAmt }],
  };

  // Find the last meal in the same section to splice after.
  let insertAt = meals.length;
  for (let i = meals.length - 1; i >= 0; i--) {
    const s = gS(meals[i].name);
    if (s === section && meals[i].time === time) {
      insertAt = i + 1;
      break;
    }
  }

  return [...meals.slice(0, insertAt), newMeal, ...meals.slice(insertAt)];
}
