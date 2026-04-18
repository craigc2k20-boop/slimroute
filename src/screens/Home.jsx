// ═══════════════════════════════════════════════════════════
// Home — the dashboard.
//
//   WeekStrip (shared, from App)
//     Day/Week toggle
//     Macro ring  ← reacts to selected day (or shows week totals)
//     P/C/F legend
//     "X kcal left this week"
//   Hydration card (per selected day)
//
// Data is still mocked until the Meals reducer is wired next.
// ═══════════════════════════════════════════════════════════

import React, { useState, useMemo } from "react";
import MacroRing from "../components/MacroRing.jsx";
import HydrationCard from "../components/HydrationCard.jsx";
import WeekStrip from "../components/WeekStrip.jsx";
import { useLocalState } from "../hooks/useLocalState.js";
import { DAYS } from "../lib/constants.js";
import { lds, wkD, getDayMode } from "../lib/date.js";
import { computeHydrationTarget } from "../lib/hydration.js";

// ─────────────────────────────────────────────────────────
// MOCK DATA — will be replaced with real reducer data when
// Meals is wired. Arrays are indexed Mon..Sun (0..6).
// ─────────────────────────────────────────────────────────
const MOCK_DAY_TOTALS_BY_IDX = [
  { cals: 2410, p: 180, c: 275, f: 70 }, // Mon
  { cals: 2480, p: 172, c: 290, f: 72 }, // Tue
  { cals: 2510, p: 185, c: 265, f: 68 }, // Wed
  { cals: 2530, p: 178, c: 300, f: 74 }, // Thu
  { cals: 2390, p: 165, c: 255, f: 66 }, // Fri
  { cals: 2416, p: 195, c: 222, f: 73 }, // Sat
  { cals: 0,    p: 0,   c: 0,   f: 0  }, // Sun (not logged)
];
const MOCK_DAY_TARGETS = { cals: 2533, p: 171, c: 304, f: 70 };
const MOCK_WEEK_TARGETS = {
  cals: MOCK_DAY_TARGETS.cals * 7,
  p: MOCK_DAY_TARGETS.p * 7,
  c: MOCK_DAY_TARGETS.c * 7,
  f: MOCK_DAY_TARGETS.f * 7,
};
// Which days are "completed" — Mon..Fri in the mock
const MOCK_COMPLETED_DAYS = [0, 1, 2, 3, 4];

export default function Home({ weekNav }) {
  const { weekKey, selectedDayIdx, onSelectDay, onShiftWeek, onJumpToToday } = weekNav;

  // Ring mode — "day" or "week"
  const [ringMode, setRingMode] = useState("day");

  // Derived: 7 Date objects for the visible week
  const weekDates = useMemo(() => wkD(weekKey), [weekKey]);
  const selectedDate = weekDates[selectedDayIdx];
  const selectedKey = lds(selectedDate);
  const dayMode = useMemo(() => getDayMode(selectedDate), [selectedDate]);

  // Hydration entries — keyed per day, persisted + cloud-synced
  const [entries, setEntries] = useLocalState(
    `hydration:${selectedKey}`,
    []
  );

  // Hydration target — formula-driven
  const hydrationTarget = useMemo(
    () =>
      computeHydrationTarget({
        bodyWeightKg: 83,
        dayType: "rest",
        hasPsyllium: false,
        hasCreatine: false,
      }),
    []
  );

  // Intercept day selection: when user taps a day, flip ring mode to Day
  const handleSelectDay = (idx) => {
    onSelectDay(idx);
    setRingMode("day");
  };

  // Compute ring totals based on mode
  const selectedDayTotals = MOCK_DAY_TOTALS_BY_IDX[selectedDayIdx] || { cals: 0, p: 0, c: 0, f: 0 };
  const weekTotals = MOCK_DAY_TOTALS_BY_IDX.reduce(
    (acc, d) => ({
      cals: acc.cals + d.cals,
      p: acc.p + d.p,
      c: acc.c + d.c,
      f: acc.f + d.f,
    }),
    { cals: 0, p: 0, c: 0, f: 0 }
  );

  const ringTotals = ringMode === "day" ? selectedDayTotals : weekTotals;
  const ringTargets = ringMode === "day" ? MOCK_DAY_TARGETS : MOCK_WEEK_TARGETS;
  const ringHeader =
    ringMode === "day"
      ? `${DAYS[selectedDayIdx]}'s progress`
      : "This week's progress";

  const weekRemaining = MOCK_WEEK_TARGETS.cals - weekTotals.cals;
  // Ring is "empty" for future days (no meals yet) or for past/present
  // days that happened to log nothing.
  const isFutureDay = ringMode === "day" && dayMode === "future";
  const isEmptyDay = ringMode === "day" && (selectedDayTotals.cals === 0 || isFutureDay);

  return (
    <div>
      <WeekStrip
        weekKey={weekKey}
        selectedDayIdx={selectedDayIdx}
        completedDayIdxs={MOCK_COMPLETED_DAYS}
        onSelectDay={handleSelectDay}
        onShiftWeek={onShiftWeek}
        onJumpToToday={onJumpToToday}
      />

      {/* Day / Week toggle */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 6 }}>
        <div
          style={{
            display: "flex",
            background: "rgba(30,41,59,0.45)",
            border: "1px solid rgba(148,163,184,0.10)",
            borderRadius: 20,
            padding: 3,
          }}
        >
          <TogglePill active={ringMode === "day"} onClick={() => setRingMode("day")}>
            Day
          </TogglePill>
          <TogglePill active={ringMode === "week"} onClick={() => setRingMode("week")}>
            Week
          </TogglePill>
        </div>
      </div>

      {/* Header above the ring */}
      <div
        style={{
          fontSize: 11,
          letterSpacing: 1.2,
          textTransform: "uppercase",
          color: "var(--text-2)",
          textAlign: "center",
          marginBottom: 6,
        }}
      >
        {ringHeader}
      </div>

      {/* Ring */}
      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
        <MacroRing
          totals={ringTotals}
          targets={ringTargets}
          size={200}
          empty={isEmptyDay}
          onTap={() => alert("Breakdown panel — coming soon.")}
        />
      </div>

      {/* Legend — only when there's data to show */}
      {!isEmptyDay && (
        <MacroLegend totals={ringTotals} targets={ringTargets} />
      )}

      {/* Weekly remaining line */}
      <div
        style={{
          textAlign: "center",
          fontSize: 13,
          fontWeight: 600,
          color: weekRemaining >= 0 ? "#fbbf24" : "#ef4444",
          margin: "10px 0 16px",
        }}
      >
        {weekRemaining >= 0
          ? `${weekRemaining.toLocaleString()} kcal left this week`
          : `${Math.abs(weekRemaining).toLocaleString()} kcal over this week`}
      </div>

      {/* Hydration card — keyed to selected day; mode drives editability */}
      <HydrationCard
        entries={entries}
        target={hydrationTarget}
        onChange={setEntries}
        mode={dayMode}
      />
    </div>
  );
}

// ─────────────────────────────────────────────────────────
// Subcomponents
// ─────────────────────────────────────────────────────────

function TogglePill({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "rgba(51,65,85,0.6)" : "transparent",
        color: active ? "var(--text-1)" : "var(--text-3)",
        border: "none",
        borderRadius: 16,
        padding: "5px 18px",
        fontSize: 11,
        fontWeight: 600,
        letterSpacing: 0.5,
        cursor: "pointer",
        fontFamily: "var(--font-sans)",
      }}
    >
      {children}
    </button>
  );
}

function MacroLegend({ totals, targets }) {
  const items = [
    { label: "P", value: totals.p, target: targets.p, color: "#f97316" },
    { label: "C", value: totals.c, target: targets.c, color: "#eab308" },
    { label: "F", value: totals.f, target: targets.f, color: "#a78bfa" },
  ];
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-around",
        fontSize: 12,
        padding: "0 4px",
      }}
    >
      {items.map((it) => (
        <div
          key={it.label}
          style={{ display: "flex", alignItems: "center", gap: 5 }}
        >
          <span
            style={{
              width: 9,
              height: 9,
              borderRadius: "50%",
              background: it.color,
            }}
          />
          <span style={{ color: "var(--text-1)", fontWeight: 600 }}>
            {Math.round(it.value)}
          </span>
          <span style={{ color: "var(--text-3)" }}>
            /{Math.round(it.target)} {it.label}
          </span>
        </div>
      ))}
    </div>
  );
}
