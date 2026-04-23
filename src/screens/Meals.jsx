// ═══════════════════════════════════════════════════════════
// Meals — the meal list for the selected day.
// Phase 2 + 3: checkbox ticks, +/- amount editing, lock toggle,
// auto-rebalance button. Each day is an independent copy.
// ═══════════════════════════════════════════════════════════

import React, { useMemo, useEffect, useState } from "react";
import WeekStrip from "../components/WeekStrip.jsx";
import MealCard from "../components/MealCard.jsx";
import Card from "../components/Card.jsx";
import AddItemFlow, { addIngredientToMeal, addNewMealToSection } from "../components/AddItemFlow.jsx";
import { useLocalState } from "../hooks/useLocalState.js";
import { DAYS } from "../lib/constants.js";
import { wkD, lds, getDayMode } from "../lib/date.js";
import { buildIngMap, sa } from "../lib/macros.js";
import { autoRebalance } from "../lib/meals.js";
import {
  DAY_TYPES,
  defaultDayTypeForWeekday,
  seedDay,
  isSeeded,
  getDayType,
} from "../lib/meal-store.js";

const IM = buildIngMap();

// Mock profile values until Profile screen is wired
const BODY_WEIGHT_KG = 83;
const BASE_CAL_TARGET = 2533; // matches mock on Home for visual consistency

export default function Meals({ weekNav }) {
  const { weekKey, selectedDayIdx, onSelectDay, onShiftWeek, onJumpToToday } = weekNav;

  const weekDates = useMemo(() => wkD(weekKey), [weekKey]);
  const selectedDate = weekDates[selectedDayIdx];
  const selectedKey = lds(selectedDate);
  const dayMode = useMemo(() => getDayMode(selectedDate), [selectedDate]);

  const dayName = DAYS[selectedDayIdx];
  const dateStr = selectedDate.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
  });

  // Day record — { dayType, meals, doneIds } — persisted and synced
  const [dayRecord, setDayRecord] = useLocalState(`meals:${selectedKey}`, null);

  // Local toast for post-rebalance feedback
  const [toast, setToast] = useState(null);
  // Add-item overlay open/closed
  const [addItemOpen, setAddItemOpen] = useState(false);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  // Seed on first visit
  useEffect(() => {
    if (isSeeded(dayRecord)) return;
    const defaultType = defaultDayTypeForWeekday(selectedDayIdx);
    setDayRecord({
      dayType: defaultType,
      meals: seedDay(defaultType),
      doneIds: [],
    });
  }, [dayRecord, selectedDayIdx, setDayRecord]);

  if (!isSeeded(dayRecord)) {
    return (
      <div>
        <WeekStrip
          weekKey={weekKey}
          selectedDayIdx={selectedDayIdx}
          completedDayIdxs={[]}
          onSelectDay={onSelectDay}
          onShiftWeek={onShiftWeek}
          onJumpToToday={onJumpToToday}
        />
        <SkeletonBlock />
      </div>
    );
  }

  const meals = dayRecord.meals;
  const doneIds = dayRecord.doneIds ?? [];
  const currentDayType = getDayType(dayRecord.dayType);
  const calTarget = Math.round(BASE_CAL_TARGET * currentDayType.calMultiplier);
  const totals = sa(meals, IM);

  // ─── Handlers ───────────────────────────────────────────
  const changeDayType = (newTypeId) => {
    if (newTypeId === dayRecord.dayType) return;
    if (
      doneIds.length > 0 &&
      !window.confirm(
        `Switching to ${getDayType(newTypeId).label} will reset ${dayName}'s meals. Continue?`
      )
    ) {
      return;
    }
    setDayRecord({
      dayType: newTypeId,
      meals: seedDay(newTypeId),
      doneIds: [],
    });
  };

  const toggleDone = (mealId) => {
    setDayRecord({
      ...dayRecord,
      doneIds: doneIds.includes(mealId)
        ? doneIds.filter((id) => id !== mealId)
        : [...doneIds, mealId],
    });
  };

  const updateAmount = (mealId, itemIdx, newAmt) => {
    setDayRecord({
      ...dayRecord,
      meals: meals.map((m) => {
        if (m.id !== mealId) return m;
        return {
          ...m,
          items: m.items.map((it, i) => (i === itemIdx ? { ...it, amt: newAmt } : it)),
        };
      }),
    });
  };

  const toggleLock = (mealId, itemIdx) => {
    setDayRecord({
      ...dayRecord,
      meals: meals.map((m) => {
        if (m.id !== mealId) return m;
        return {
          ...m,
          items: m.items.map((it, i) =>
            i === itemIdx ? { ...it, locked: !it.locked } : it
          ),
        };
      }),
    });
  };

  const deleteItem = (mealId, itemIdx) => {
    setDayRecord({
      ...dayRecord,
      meals: meals
        .map((m) => {
          if (m.id !== mealId) return m;
          return {
            ...m,
            items: m.items.filter((_, i) => i !== itemIdx),
          };
        })
        // Cascade: drop any meal that ends up empty AND wasn't user-named
        // (empty user-named meals stay, so the user can re-fill them)
        .filter((m) => m.items.length > 0 || m.userNamed),
    });
    // Also clean up doneIds — if the meal was removed, drop its id
    const stillExisting = new Set(meals.map((m) => m.id));
    const nextDoneIds = doneIds.filter((id) => stillExisting.has(id));
    if (nextDoneIds.length !== doneIds.length) {
      setDayRecord((r) => ({ ...r, doneIds: nextDoneIds }));
    }
  };

  const deleteMeal = (mealId) => {
    setDayRecord({
      ...dayRecord,
      meals: meals.filter((m) => m.id !== mealId),
      doneIds: doneIds.filter((id) => id !== mealId),
    });
  };

  const renameMeal = (mealId, newName) => {
    setDayRecord({
      ...dayRecord,
      meals: meals.map((m) => {
        if (m.id !== mealId) return m;
        // Meal name format is "Section — Name" (a string). Rebuild it:
        const section = m.name.includes(" — ")
          ? m.name.slice(0, m.name.indexOf(" — "))
          : m.name;
        if (newName === null || newName === "") {
          // Clear user-set name → revert to auto
          return { ...m, name: section, userNamed: false };
        }
        return { ...m, name: `${section} — ${newName}`, userNamed: true };
      }),
    });
  };

  const runRebalance = () => {
    const before = sa(meals, IM).cals;
    // Preserve any user-chosen macro preference — balanced by default
    const rebalanced = autoRebalance(meals, calTarget, IM, doneIds, "balanced", BODY_WEIGHT_KG);
    const after = sa(rebalanced, IM).cals;
    setDayRecord({ ...dayRecord, meals: rebalanced });
    setToast(`Auto-rebalanced · ${before} → ${after} kcal (target ${calTarget})`);
  };

  const copyDay = () => {
    alert(`(Placeholder) Would copy ${dayName}'s meals to another day.`);
  };

  const addItem = () => {
    if (meals.length === 0) {
      alert("No meal sections yet. Add a section first.");
      return;
    }
    setAddItemOpen(true);
  };

  const handleAddIngredient = (mealId, ingId) => {
    setDayRecord({
      ...dayRecord,
      meals: addIngredientToMeal(meals, mealId, ingId),
    });
    setToast(`Added to meal`);
  };

  const handleAddNewMeal = (section, time, ingId) => {
    setDayRecord({
      ...dayRecord,
      meals: addNewMealToSection(meals, section, time, ingId),
    });
    setToast(`New meal added to ${section}`);
  };

  const scanItem = () =>
    alert("(Placeholder) Barcode scanner comes in Phase 4.");
  const savedTemplate = () =>
    alert("(Placeholder) Saved meal templates come in Phase 4.");
  const createNewMeal = () =>
    alert("(Placeholder) Meal builder comes in Phase 4.");
  const addSection = () =>
    alert("(Placeholder) New meal section card comes in Phase 4.");

  const isPast = dayMode === "past";
  const isFuture = dayMode === "future";
  const isReadOnly = isPast || isFuture;

  const completeCount = doneIds.length;
  const totalCount = meals.length;
  const allComplete = totalCount > 0 && completeCount === totalCount;

  // Work out which meal is "next up" (first un-done, chronological)
  const nextMealId = meals.find((m) => !doneIds.includes(m.id))?.id;

  return (
    <div>
      <WeekStrip
        weekKey={weekKey}
        selectedDayIdx={selectedDayIdx}
        completedDayIdxs={allComplete ? [selectedDayIdx] : []}
        onSelectDay={onSelectDay}
        onShiftWeek={onShiftWeek}
        onJumpToToday={onJumpToToday}
      />

      {/* Day header */}
      <div
        style={{
          display: "flex",
          alignItems: "flex-start",
          justifyContent: "space-between",
          gap: 10,
          marginBottom: 14,
        }}
      >
        <div>
          <h2
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 28,
              fontWeight: 700,
              color: "var(--text-1)",
              letterSpacing: "-0.5px",
              lineHeight: 1,
              margin: 0,
            }}
          >
            {dayName}
          </h2>
          <div
            style={{
              fontSize: 11,
              letterSpacing: 1.2,
              textTransform: "uppercase",
              color: "var(--text-3)",
              marginTop: 4,
            }}
          >
            {dateStr}
          </div>
        </div>
        {!isReadOnly && (
          <button onClick={copyDay} style={copyBtnStyle}>
            <CopyIcon />
            Copy day
          </button>
        )}
      </div>

      {/* Day-type toggle + day totals row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 10,
          marginBottom: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
          <span style={sectionLabelStyle}>Day type</span>
          {DAY_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => !isReadOnly && changeDayType(t.id)}
              disabled={isReadOnly}
              style={{
                ...dayTypePillStyle,
                ...(dayRecord.dayType === t.id ? dayTypePillActiveStyle : null),
                opacity: isReadOnly ? 0.5 : 1,
                cursor: isReadOnly ? "default" : "pointer",
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <div
          style={{
            fontSize: 11,
            color: "var(--text-3)",
            fontWeight: 700,
            letterSpacing: 0.8,
          }}
        >
          <span style={{ color: "var(--text-1)", fontWeight: 700 }}>
            {totals.cals}
          </span>
          <span style={{ color: "var(--text-3)", margin: "0 4px" }}>/</span>
          <span style={{ color: "var(--text-2)" }}>{calTarget} kcal</span>
        </div>
      </div>

      {/* Auto-rebalance row */}
      {!isReadOnly && (
        <div style={{ marginBottom: 14 }}>
          <button onClick={runRebalance} style={rebalanceBtnStyle}>
            <RefreshIcon /> Auto-rebalance to {calTarget} kcal
          </button>
          <div
            style={{
              fontSize: 10,
              color: "var(--text-3)",
              marginTop: 4,
              lineHeight: 1.4,
            }}
          >
            Redistributes unlocked ingredients toward today's target. Locked
            items and already-eaten meals won't change.
          </div>
        </div>
      )}

      {/* Meal cards */}
      <div>
        {meals.map((m) => {
          const isDone = doneIds.includes(m.id);
          const isActive = !isDone && m.id === nextMealId;
          return (
            <MealCard
              key={m.id}
              meal={m}
              state={isDone ? "done" : isActive ? "active" : "idle"}
              readOnly={isReadOnly}
              onToggleDone={() => toggleDone(m.id)}
              onUpdateAmount={(itemIdx, newAmt) =>
                updateAmount(m.id, itemIdx, newAmt)
              }
              onToggleLock={(itemIdx) => toggleLock(m.id, itemIdx)}
              onDeleteItem={(itemIdx) => deleteItem(m.id, itemIdx)}
              onRenameMeal={(newName) => renameMeal(m.id, newName)}
              onDeleteMeal={() => deleteMeal(m.id)}
            />
          );
        })}
      </div>

      {/* Completion progress */}
      {!isReadOnly && (
        <div
          style={{
            padding: "10px 14px",
            background: allComplete
              ? "rgba(34,197,94,0.12)"
              : "rgba(30,41,59,0.35)",
            border: `1px solid ${
              allComplete
                ? "rgba(34,197,94,0.35)"
                : "rgba(148,163,184,0.08)"
            }`,
            borderRadius: 10,
            marginTop: 4,
            marginBottom: 16,
            textAlign: "center",
            fontSize: 12,
            fontWeight: 700,
            color: allComplete ? "#4ade80" : "var(--text-2)",
            letterSpacing: 0.4,
          }}
        >
          {allComplete
            ? `✓ All ${totalCount} meals complete · Day finished`
            : `${completeCount} / ${totalCount} meals complete`}
        </div>
      )}

      {/* Action panel */}
      {!isReadOnly && (
        <Card style={{ padding: 8, marginTop: 4 }}>
          <ActionButton icon="➕" label="Add item" onClick={addItem} />
          <ActionButton icon="📷" label="Scan item" onClick={scanItem} />
          <ActionButton
            icon="📋"
            label="Saved meal template"
            onClick={savedTemplate}
          />
          <ActionButton icon="✏️" label="Create new meal" onClick={createNewMeal} />
        </Card>
      )}

      {/* Add-section placeholder */}
      {!isReadOnly && (
        <Card style={{ padding: 14, marginTop: 12 }}>
          <div style={sectionLabelStyle}>Add a new meal section</div>
          <button
            onClick={addSection}
            style={{ ...addSectionBtnStyle, marginTop: 8 }}
          >
            + Add section
          </button>
        </Card>
      )}

      {isPast && (
        <Banner
          color="slate"
          text="Past day — viewing only. Edits are locked."
        />
      )}
      {isFuture && (
        <Banner
          color="blue"
          text="Future day — planning view. Details become editable when the day arrives."
        />
      )}

      {/* Toast */}
      {toast && (
        <div
          style={{
            position: "fixed",
            top: 12,
            left: "50%",
            transform: "translateX(-50%)",
            background: "rgba(34,211,238,0.95)",
            color: "#042f2e",
            padding: "8px 18px",
            borderRadius: 18,
            fontSize: 12,
            fontWeight: 700,
            zIndex: 100,
            boxShadow: "0 4px 20px rgba(34,211,238,0.3)",
            fontFamily: "var(--font-sans)",
          }}
        >
          {toast}
        </div>
      )}

      {/* Add-item overlay */}
      {addItemOpen && (
        <AddItemFlow
          meals={meals}
          doneIds={doneIds}
          onAdd={handleAddIngredient}
          onAddNewMeal={handleAddNewMeal}
          onClose={() => setAddItemOpen(false)}
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Subcomponents
// ═══════════════════════════════════════════════════════════

function SkeletonBlock() {
  return (
    <div
      style={{
        height: 200,
        borderRadius: 12,
        background:
          "linear-gradient(90deg, rgba(148,163,184,0.05) 0%, rgba(148,163,184,0.1) 50%, rgba(148,163,184,0.05) 100%)",
      }}
    />
  );
}

function ActionButton({ icon, label, onClick }) {
  return (
    <button
      onClick={onClick}
      style={{
        width: "100%",
        padding: "10px 12px",
        background: "transparent",
        border: "none",
        color: "var(--text-1)",
        fontSize: 13,
        fontWeight: 600,
        cursor: "pointer",
        textAlign: "left",
        display: "flex",
        alignItems: "center",
        gap: 10,
        fontFamily: "var(--font-sans)",
        borderRadius: 7,
      }}
    >
      <span style={{ fontSize: 16 }}>{icon}</span>
      <span>{label}</span>
    </button>
  );
}

function Banner({ color, text }) {
  const bg = color === "blue" ? "rgba(59,130,246,0.08)" : "rgba(148,163,184,0.08)";
  const border = color === "blue" ? "rgba(59,130,246,0.25)" : "rgba(148,163,184,0.2)";
  const textCol = color === "blue" ? "#93c5fd" : "var(--text-2)";
  return (
    <div
      style={{
        marginTop: 14,
        padding: "10px 14px",
        background: bg,
        border: `1px solid ${border}`,
        borderRadius: 10,
        color: textCol,
        fontSize: 12,
        lineHeight: 1.4,
      }}
    >
      {text}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Styles
// ═══════════════════════════════════════════════════════════

const sectionLabelStyle = {
  fontSize: 10,
  color: "var(--text-3)",
  fontWeight: 700,
  letterSpacing: 1,
  textTransform: "uppercase",
};

const copyBtnStyle = {
  display: "flex",
  alignItems: "center",
  gap: 6,
  background: "rgba(30,41,59,0.4)",
  border: "1px solid rgba(148,163,184,0.1)",
  borderRadius: 10,
  padding: "8px 12px",
  color: "var(--text-2)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
  whiteSpace: "nowrap",
  flexShrink: 0,
};

const dayTypePillStyle = {
  background: "rgba(30,41,59,0.4)",
  border: "1px solid rgba(148,163,184,0.12)",
  borderRadius: 14,
  padding: "4px 12px",
  color: "var(--text-2)",
  fontSize: 11,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
  letterSpacing: 0.3,
};

const dayTypePillActiveStyle = {
  background: "rgba(34,211,238,0.14)",
  borderColor: "rgba(34,211,238,0.35)",
  color: "#22d3ee",
};

const rebalanceBtnStyle = {
  width: "100%",
  padding: "10px 14px",
  background: "rgba(59,130,246,0.15)",
  border: "1px solid rgba(59,130,246,0.3)",
  borderRadius: 10,
  color: "#93c5fd",
  fontSize: 12,
  fontWeight: 700,
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  gap: 8,
  letterSpacing: 0.3,
};

const addSectionBtnStyle = {
  width: "100%",
  padding: "8px 12px",
  background: "rgba(30,41,59,0.4)",
  border: "1px dashed rgba(148,163,184,0.2)",
  borderRadius: 8,
  color: "var(--text-2)",
  fontSize: 12,
  fontWeight: 600,
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
};

// ═══════════════════════════════════════════════════════════
// Icons
// ═══════════════════════════════════════════════════════════

function CopyIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12a9 9 0 0 1 15.5-6.3L21 8" />
      <path d="M21 3v5h-5" />
      <path d="M21 12a9 9 0 0 1-15.5 6.3L3 16" />
      <path d="M3 21v-5h5" />
    </svg>
  );
}
