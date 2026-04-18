// ═══════════════════════════════════════════════════════════
// MealCard — interactive meal row.
//
// Display name rules:
//   - If meal has exactly 1 ingredient AND no user-set name → show
//     the ingredient's food name (e.g. "Banana")
//   - Otherwise → show the meal's stored name (gL(meal.name))
//     falling back to "Untitled meal"
//
// Expanded view adds:
//   - Rename button (pencil) — prompts for a new name, stored on meal
//   - Delete meal button — confirms if non-empty, silent if empty.
//
// State is fully controlled by the parent via callbacks.
// ═══════════════════════════════════════════════════════════

import React, { useState, useMemo, useRef, useEffect } from "react";
import { sm, ci, buildIngMap, ingMin, ingMax, ingDiscrete } from "../lib/macros.js";
import { gS, gL } from "../lib/date.js";

const IM = buildIngMap();
const UI_STEP = () => 1; // 1 per press — see bug-fix history

export default function MealCard({
  meal,
  state = "idle",
  readOnly = false,
  onToggleDone,
  onUpdateAmount,
  onToggleLock,
  onDeleteItem,
  onRenameMeal,    // (newName) → void
  onDeleteMeal,    // () → void
}) {
  const [expanded, setExpanded] = useState(false);

  const totals = sm(meal, IM);
  const section = gS(meal.name);
  const storedName = gL(meal.name);

  // Display-name logic
  const itemCount = meal.items.length;
  const firstIng = itemCount === 1 ? IM[meal.items[0].ingId] : null;
  const displayName = useMemo(() => {
    if (itemCount === 0) return storedName ?? "Empty meal";
    if (itemCount === 1 && !meal.userNamed) return firstIng?.food ?? "Untitled meal";
    return storedName ?? "Untitled meal";
  }, [itemCount, firstIng, storedName, meal.userNamed]);

  const borderColor =
    state === "done"
      ? "rgba(34,197,94,0.5)"
      : state === "active"
      ? "rgba(251,146,60,0.5)"
      : "rgba(148,163,184,0.15)";

  const isDone = state === "done";
  const isEmpty = itemCount === 0;

  return (
    <div style={{ marginBottom: 12 }}>
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

      <div
        className="card"
        style={{
          padding: 0,
          border: `1px solid ${borderColor}`,
          transition: "border-color .2s",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            padding: "12px 14px",
          }}
        >
          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            aria-label={expanded ? "Collapse meal" : "Expand meal"}
            style={{
              flex: 1,
              minWidth: 0,
              background: "transparent",
              border: "none",
              padding: 0,
              textAlign: "left",
              cursor: "pointer",
              color: "var(--text-1)",
              fontFamily: "var(--font-sans)",
              display: "flex",
              flexDirection: "column",
              alignItems: "flex-start",
              gap: 3,
            }}
          >
            <span
              style={{
                fontSize: 15,
                fontWeight: 700,
                textDecoration: isDone ? "line-through" : "none",
                opacity: isDone ? 0.6 : 1,
              }}
            >
              {displayName}
            </span>
            <span
              style={{
                fontSize: 11,
                color: "var(--text-3)",
                fontWeight: 600,
                display: "flex",
                gap: 8,
                alignItems: "baseline",
              }}
            >
              {isEmpty ? (
                <span style={{ fontStyle: "italic" }}>Empty — add ingredients</span>
              ) : (
                <>
                  <span style={{ color: "var(--text-2)" }}>{totals.cals} kcal</span>
                  <span style={{ color: "#60a5fa" }}>{Math.round(totals.p)}P</span>
                  <span style={{ color: "#eab308" }}>{Math.round(totals.c)}C</span>
                  <span style={{ color: "#a78bfa" }}>{Math.round(totals.f)}F</span>
                </>
              )}
            </span>
          </button>

          <span
            style={{
              color: "var(--text-3)",
              fontSize: 11,
              userSelect: "none",
              transform: expanded ? "rotate(180deg)" : "none",
              transition: "transform .15s",
              padding: "0 4px",
            }}
            aria-hidden
          >
            ▼
          </span>

          <button
            onClick={() => !readOnly && !isEmpty && onToggleDone?.()}
            disabled={readOnly || isEmpty}
            role="checkbox"
            aria-checked={isDone}
            aria-label={isDone ? "Mark as not done" : "Mark as done"}
            style={{
              width: 28,
              height: 28,
              borderRadius: 6,
              border: isDone
                ? "2px solid #22c55e"
                : "2px solid rgba(71,85,105,0.6)",
              background: isDone ? "rgba(34,197,94,0.85)" : "rgba(15,23,42,0.4)",
              color: isDone ? "#052e16" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 14,
              fontWeight: 700,
              flexShrink: 0,
              cursor: readOnly || isEmpty ? "default" : "pointer",
              opacity: readOnly || isEmpty ? 0.4 : 1,
              transition: "all .15s",
            }}
          >
            {isDone ? "✓" : ""}
          </button>
        </div>

        {expanded && (
          <div
            style={{
              borderTop: "1px solid rgba(148,163,184,0.1)",
              padding: "6px 0 4px",
              background: "rgba(15,23,42,0.25)",
            }}
          >
            {itemCount === 0 ? (
              <div
                style={{
                  padding: "14px 16px",
                  fontSize: 12,
                  color: "var(--text-3)",
                  fontStyle: "italic",
                  textAlign: "center",
                }}
              >
                No ingredients yet. Use "Add item" below to add one.
              </div>
            ) : (
              meal.items.map((item, i) => (
                <IngredientRow
                  key={i}
                  item={item}
                  readOnly={readOnly || isDone}
                  onUpdateAmount={
                    onUpdateAmount ? (a) => onUpdateAmount(i, a) : undefined
                  }
                  onToggleLock={onToggleLock ? () => onToggleLock(i) : undefined}
                  onDelete={onDeleteItem ? () => onDeleteItem(i) : undefined}
                />
              ))
            )}

            {/* Meal-level actions footer — rename + delete */}
            {!readOnly && (onRenameMeal || onDeleteMeal) && (
              <MealActions
                displayName={displayName}
                itemCount={itemCount}
                storedName={storedName}
                onRenameMeal={onRenameMeal}
                onDeleteMeal={onDeleteMeal}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// MealActions — footer inside the expanded view
// ═══════════════════════════════════════════════════════════

function MealActions({ displayName, itemCount, storedName, onRenameMeal, onDeleteMeal }) {
  const handleRename = () => {
    const seed = storedName ?? (itemCount === 1 ? "" : displayName);
    const next = window.prompt("Meal name:", seed);
    if (next === null) return; // cancelled
    const trimmed = next.trim();
    onRenameMeal?.(trimmed || null); // null = clear name (revert to auto)
  };

  const handleDelete = () => {
    if (itemCount > 0) {
      const msg =
        itemCount === 1
          ? `Delete "${displayName}"?`
          : `Delete "${displayName}" and its ${itemCount} ingredients?`;
      if (!window.confirm(msg)) return;
    }
    onDeleteMeal?.();
  };

  return (
    <div
      style={{
        display: "flex",
        justifyContent: "flex-end",
        gap: 6,
        padding: "6px 12px 8px",
        borderTop: "1px solid rgba(148,163,184,0.06)",
        marginTop: 2,
      }}
    >
      {onRenameMeal && (
        <button onClick={handleRename} style={mealActionBtnStyle} aria-label="Rename meal" title="Rename meal">
          <PencilIcon />
          <span>Rename</span>
        </button>
      )}
      {onDeleteMeal && (
        <button
          onClick={handleDelete}
          style={{ ...mealActionBtnStyle, color: "rgba(239,68,68,0.8)" }}
          aria-label="Delete meal"
          title="Delete meal"
        >
          <TrashIcon />
          <span>Delete meal</span>
        </button>
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// IngredientRow — one row per item in a meal
// ═══════════════════════════════════════════════════════════

function IngredientRow({ item, readOnly, onUpdateAmount, onToggleLock, onDelete }) {
  const ing = IM[item.ingId];
  const macros = useMemo(() => (ing ? ci(ing, item.amt) : null), [ing, item.amt]);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(String(item.amt));
  const inputRef = useRef(null);

  useEffect(() => {
    if (editing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [editing]);

  if (!ing) {
    return (
      <div style={{ padding: "8px 14px", fontSize: 12, color: "var(--text-3)", fontStyle: "italic" }}>
        Missing ingredient: {item.ingId}
      </div>
    );
  }

  const discrete = ingDiscrete(ing);
  const step = UI_STEP(ing);
  const min = ingMin(ing);
  const max = ingMax(ing);

  const canDecrement = !readOnly && !item.locked && item.amt > min;
  const canIncrement = !readOnly && !item.locked && item.amt < max;

  const dec = () => {
    if (!canDecrement) return;
    onUpdateAmount?.(Math.max(min, item.amt - step));
  };
  const inc = () => {
    if (!canIncrement) return;
    onUpdateAmount?.(Math.min(max, item.amt + step));
  };

  const startEdit = () => {
    if (readOnly || item.locked) return;
    setDraft(String(item.amt));
    setEditing(true);
  };

  const commitEdit = () => {
    const raw = parseInt(draft, 10);
    if (!isNaN(raw) && raw >= 0) {
      const next = discrete
        ? Math.max(min, Math.min(max, Math.round(raw)))
        : Math.max(min, Math.min(max, raw));
      onUpdateAmount?.(next);
    }
    setEditing(false);
  };

  const cancelEdit = () => {
    setDraft(String(item.amt));
    setEditing(false);
  };

  const handleDelete = () => {
    if (readOnly) return;
    if (!window.confirm(`Remove ${ing.food} from this meal?`)) return;
    onDelete?.();
  };

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 14px" }}>
      <button
        onClick={() => !readOnly && onToggleLock?.()}
        disabled={readOnly}
        aria-label={item.locked ? "Unlock ingredient" : "Lock ingredient"}
        title={item.locked ? "Locked" : "Unlocked"}
        style={{
          width: 22,
          height: 22,
          borderRadius: 5,
          background: item.locked ? "rgba(251,191,36,0.18)" : "transparent",
          border: `1px solid ${item.locked ? "rgba(251,191,36,0.45)" : "rgba(148,163,184,0.18)"}`,
          color: item.locked ? "#fbbf24" : "var(--text-3)",
          cursor: readOnly ? "default" : "pointer",
          flexShrink: 0,
          padding: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          opacity: readOnly ? 0.5 : 1,
        }}
      >
        {item.locked ? <LockClosed /> : <LockOpen />}
      </button>

      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 13,
            fontWeight: 600,
            color: "var(--text-1)",
            fontFamily: "var(--font-sans)",
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
            marginTop: 1,
            display: "flex",
            gap: 6,
          }}
        >
          <span>{macros.cals} kcal</span>
          <span style={{ color: "#60a5fa" }}>{Math.round(macros.p)}P</span>
          <span style={{ color: "#eab308" }}>{Math.round(macros.c)}C</span>
          <span style={{ color: "#a78bfa" }}>{Math.round(macros.f)}F</span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 4,
          background: "rgba(15,23,42,0.5)",
          border: "1px solid rgba(148,163,184,0.12)",
          borderRadius: 7,
          padding: 2,
          opacity: readOnly ? 0.5 : 1,
        }}
      >
        <StepButton onClick={dec} disabled={!canDecrement} label="−" />
        {editing ? (
          <input
            ref={inputRef}
            type="number"
            inputMode="numeric"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={commitEdit}
            onKeyDown={(e) => {
              if (e.key === "Enter") commitEdit();
              else if (e.key === "Escape") cancelEdit();
            }}
            style={{
              width: 54,
              textAlign: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-1)",
              fontFamily: "var(--font-sans)",
              background: "rgba(15,23,42,0.8)",
              border: "1px solid rgba(59,130,246,0.4)",
              borderRadius: 4,
              padding: "2px 4px",
              outline: "none",
            }}
          />
        ) : (
          <button
            onClick={startEdit}
            disabled={readOnly || item.locked}
            style={{
              minWidth: 50,
              textAlign: "center",
              fontSize: 12,
              fontWeight: 700,
              color: "var(--text-1)",
              fontFamily: "var(--font-sans)",
              whiteSpace: "nowrap",
              padding: "2px 6px",
              background: "transparent",
              border: "none",
              cursor: readOnly || item.locked ? "default" : "pointer",
              borderRadius: 4,
            }}
          >
            {item.amt}
            {!discrete && (
              <span style={{ fontSize: 9, color: "var(--text-3)", marginLeft: 2, fontWeight: 600 }}>g</span>
            )}
          </button>
        )}
        <StepButton onClick={inc} disabled={!canIncrement} label="+" />
      </div>

      {!readOnly && (
        <button
          onClick={handleDelete}
          aria-label="Delete ingredient"
          title="Delete ingredient"
          style={{
            width: 26,
            height: 26,
            borderRadius: 6,
            border: "1px solid rgba(239,68,68,0.2)",
            background: "transparent",
            color: "rgba(239,68,68,0.7)",
            cursor: "pointer",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
            padding: 0,
          }}
        >
          <TrashIcon />
        </button>
      )}
    </div>
  );
}

function StepButton({ onClick, disabled, label }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 26,
        height: 26,
        borderRadius: 5,
        border: "none",
        background: disabled ? "rgba(51,65,85,0.25)" : "rgba(59,130,246,0.18)",
        color: disabled ? "var(--text-3)" : "#93c5fd",
        fontSize: 15,
        fontWeight: 700,
        cursor: disabled ? "default" : "pointer",
        padding: 0,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-sans)",
        lineHeight: 1,
      }}
    >
      {label}
    </button>
  );
}

const mealActionBtnStyle = {
  display: "inline-flex",
  alignItems: "center",
  gap: 5,
  background: "transparent",
  border: "1px solid rgba(148,163,184,0.12)",
  borderRadius: 7,
  padding: "5px 10px",
  color: "var(--text-2)",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
};

function LockClosed() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </svg>
  );
}
function LockOpen() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 6h18" />
      <path d="M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
    </svg>
  );
}
function PencilIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z" />
    </svg>
  );
}
