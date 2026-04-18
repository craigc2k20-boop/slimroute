// ═══════════════════════════════════════════════════════════
// Meals — the meal list for the selected day.
//
// Each day has its own independent copy of the meals, seeded
// from the day-type template on first visit. Edits stay in
// that day only. (Onboarding + full edit UI come in later phases.)
//
// Phase 1: static list rendering. Checkboxes visible but inert;
// add-item / copy-day show placeholder alerts.
// ═══════════════════════════════════════════════════════════

import React, { useMemo, useEffect } from "react";
import WeekStrip from "../components/WeekStrip.jsx";
import MealCard from "../components/MealCard.jsx";
import Card from "../components/Card.jsx";
import { useLocalState } from "../hooks/useLocalState.js";
import { DAYS } from "../lib/constants.js";
import { wkD, lds, getDayMode } from "../lib/date.js";
import {
  DAY_TYPES,
  defaultDayTypeForWeekday,
  seedDay,
  isSeeded,
  getDayType,
} from "../lib/meal-store.js";

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

  // Day record — { dayType, meals } — persisted and synced.
  // null when the day has never been opened before.
  const [dayRecord, setDayRecord] = useLocalState(`meals:${selectedKey}`, null);

  // On first visit, seed a fresh independent copy from the template.
  useEffect(() => {
    if (isSeeded(dayRecord)) return;
    const defaultType = defaultDayTypeForWeekday(selectedDayIdx);
    setDayRecord({
      dayType: defaultType,
      meals: seedDay(defaultType),
    });
  }, [dayRecord, selectedDayIdx, setDayRecord]);

  // While seeding, dayRecord is briefly null — render a small skeleton
  if (!isSeeded(dayRecord)) {
    return (
      <div>
        <WeekStripShell weekNav={weekNav} />
        <SkeletonBlock />
      </div>
    );
  }

  const currentDayType = getDayType(dayRecord.dayType);

  const changeDayType = (newTypeId) => {
    if (newTypeId === dayRecord.dayType) return;
    // Changing day type re-seeds with the new template — Phase 1
    // keeps this simple; Phase 3 will offer a confirm dialog if
    // the user has already logged meals.
    setDayRecord({
      dayType: newTypeId,
      meals: seedDay(newTypeId),
    });
  };

  const copyDay = () => {
    alert(`(Placeholder) Would copy ${dayName}'s meals to another day.`);
  };

  const addItem = () => alert("(Placeholder) 'Add to which meal?' picker comes next phase.");
  const scanItem = () => alert("(Placeholder) Barcode scanner comes in Phase 4.");
  const savedTemplate = () => alert("(Placeholder) Saved meal templates come next phase.");
  const createNewMeal = () => alert("(Placeholder) Meal builder comes next phase.");
  const addSection = () => alert("(Placeholder) New meal section card comes next phase.");

  // For past days, show the list as read-only; for future days, show
  // the list too (user is planning ahead), but no add/copy buttons.
  const isPast = dayMode === "past";
  const isFuture = dayMode === "future";

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
        {!isPast && !isFuture && (
          <button onClick={copyDay} style={copyBtnStyle}>
            <CopyIcon />
            Copy day
          </button>
        )}
      </div>

      {/* Day-type toggle — temporary placeholder until onboarding */}
      <div
        style={{
          display: "flex",
          gap: 6,
          marginBottom: 14,
          alignItems: "center",
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: "var(--text-3)",
            fontWeight: 700,
            letterSpacing: 1,
            textTransform: "uppercase",
            marginRight: 4,
          }}
        >
          Day type
        </span>
        {DAY_TYPES.map((t) => (
          <button
            key={t.id}
            onClick={() => !isPast && changeDayType(t.id)}
            disabled={isPast}
            style={{
              ...dayTypePillStyle,
              ...(dayRecord.dayType === t.id ? dayTypePillActiveStyle : null),
              opacity: isPast ? 0.5 : 1,
              cursor: isPast ? "default" : "pointer",
            }}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Meal cards */}
      <div>
        {dayRecord.meals.map((m) => (
          <MealCard key={m.id} meal={m} state="idle" />
        ))}
      </div>

      {/* Phase-1 action panel — placeholders for next phase */}
      {!isPast && !isFuture && (
        <Card style={{ padding: 8, marginTop: 8 }}>
          <ActionButton icon="➕" label="Add item" onClick={addItem} />
          <ActionButton icon="📷" label="Scan item" onClick={scanItem} />
          <ActionButton icon="📋" label="Saved meal template" onClick={savedTemplate} />
          <ActionButton icon="✏️" label="Create new meal" onClick={createNewMeal} />
        </Card>
      )}

      {/* Add-section placeholder */}
      {!isPast && !isFuture && (
        <Card style={{ padding: 14, marginTop: 12 }}>
          <div
            style={{
              fontSize: 10,
              letterSpacing: 1,
              color: "var(--text-3)",
              fontWeight: 700,
              textTransform: "uppercase",
              marginBottom: 8,
            }}
          >
            Add a new meal section
          </div>
          <button onClick={addSection} style={addSectionBtnStyle}>
            + Add section
          </button>
        </Card>
      )}

      {/* Read-only / future banners */}
      {isPast && (
        <Banner
          color="slate"
          text="Past day — viewing only. Check a past day's meals but edits are locked."
        />
      )}
      {isFuture && (
        <Banner
          color="blue"
          text="Future day — planning view. Meal details become editable when the day arrives."
        />
      )}
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Subcomponents
// ═══════════════════════════════════════════════════════════

function WeekStripShell({ weekNav }) {
  return (
    <WeekStrip
      weekKey={weekNav.weekKey}
      selectedDayIdx={weekNav.selectedDayIdx}
      completedDayIdxs={[]}
      onSelectDay={weekNav.onSelectDay}
      onShiftWeek={weekNav.onShiftWeek}
      onJumpToToday={weekNav.onJumpToToday}
    />
  );
}

function SkeletonBlock() {
  return (
    <div
      style={{
        height: 200,
        borderRadius: 12,
        background:
          "linear-gradient(90deg, rgba(148,163,184,0.05) 0%, rgba(148,163,184,0.1) 50%, rgba(148,163,184,0.05) 100%)",
        animation: "pulse 1.5s ease-in-out infinite",
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
        transition: "background .12s",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.background = "rgba(148,163,184,0.06)")}
      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
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

function CopyIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <rect x="9" y="9" width="13" height="13" rx="2" />
      <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
    </svg>
  );
}
