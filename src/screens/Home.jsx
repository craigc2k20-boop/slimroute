// ═══════════════════════════════════════════════════════════
// Home — the dashboard.
// Ring reads real meal data from per-day stores written by
// the Meals screen. Empty/untouched days show an empty ring.
// ═══════════════════════════════════════════════════════════

import React, { useState, useMemo } from "react";
import MacroRing from "../components/MacroRing.jsx";
import HydrationCard from "../components/HydrationCard.jsx";
import WeekStrip from "../components/WeekStrip.jsx";
import { useLocalState } from "../hooks/useLocalState.js";
import { DAYS } from "../lib/constants.js";
import { lds, wkD, getDayMode } from "../lib/date.js";
import { computeHydrationTarget } from "../lib/hydration.js";
import { buildIngMap, sa } from "../lib/macros.js";
import { readDayRecord, getDayType } from "../lib/meal-store.js";

const IM = buildIngMap();
const BODY_WEIGHT_KG = 83;
const BASE_CAL_TARGET = 2533;

// Compute totals and targets for a single day from its stored record
function computeDayView(date) {
  const key = lds(date);
  const rec = readDayRecord(key);
  if (!rec) {
    return {
      totals: { cals: 0, p: 0, c: 0, f: 0 },
      targets: defaultTargetsForWeekday(date),
      touched: false,
    };
  }
  const totals = sa(rec.meals, IM);
  const type = getDayType(rec.dayType);
  const cals = Math.round(BASE_CAL_TARGET * type.calMultiplier);
  return {
    totals: { cals: totals.cals, p: totals.p, c: totals.c, f: totals.f },
    targets: {
      cals,
      p: Math.round(cals * 0.27 / 4), // ~27% protein @ 4 kcal/g
      c: Math.round(cals * 0.48 / 4), // ~48% carbs
      f: Math.round(cals * 0.25 / 9), // ~25% fat @ 9 kcal/g
    },
    touched: true,
    doneIds: rec.doneIds ?? [],
    mealCount: rec.meals.length,
  };
}

function defaultTargetsForWeekday() {
  return {
    cals: BASE_CAL_TARGET,
    p: Math.round(BASE_CAL_TARGET * 0.27 / 4),
    c: Math.round(BASE_CAL_TARGET * 0.48 / 4),
    f: Math.round(BASE_CAL_TARGET * 0.25 / 9),
  };
}

export default function Home({ weekNav }) {
  const { weekKey, selectedDayIdx, onSelectDay, onShiftWeek, onJumpToToday } = weekNav;

  const [ringMode, setRingMode] = useState("day");

  const weekDates = useMemo(() => wkD(weekKey), [weekKey]);
  const selectedDate = weekDates[selectedDayIdx];
  const selectedKey = lds(selectedDate);
  const dayMode = useMemo(() => getDayMode(selectedDate), [selectedDate]);

  // Hydration — already per-day via its own localStorage key
  const [entries, setEntries] = useLocalState(`hydration:${selectedKey}`, []);
  const hydrationTarget = useMemo(
    () =>
      computeHydrationTarget({
        bodyWeightKg: BODY_WEIGHT_KG,
        dayType: "rest",
        hasPsyllium: false,
        hasCreatine: false,
      }),
    []
  );

  // Compute view data for every day (used for week ring + completion dots)
  const weekData = useMemo(
    () => weekDates.map((d) => computeDayView(d)),
    // re-derive whenever the week or selected day changes — any edit on
    // Meals rewrites localStorage and flips selectedKey, giving us a reason
    // to recompute. Also recompute if entries change (proxy for activity).
    // Hack-ish: we compute fresh each render because localStorage isn't
    // reactive; pulling in selectedKey ensures tab switches re-read.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [weekKey, selectedDayIdx, selectedKey, entries.length]
  );

  const handleSelectDay = (idx) => {
    onSelectDay(idx);
    setRingMode("day");
  };

  // Day ring data
  const dayView = weekData[selectedDayIdx];
  const dayTotals = dayView.totals;
  const dayTargets = dayView.targets;

  // Week ring data
  const weekTotals = weekData.reduce(
    (acc, d) => ({
      cals: acc.cals + d.totals.cals,
      p: acc.p + d.totals.p,
      c: acc.c + d.totals.c,
      f: acc.f + d.totals.f,
    }),
    { cals: 0, p: 0, c: 0, f: 0 }
  );
  const weekTargets = weekData.reduce(
    (acc, d) => ({
      cals: acc.cals + d.targets.cals,
      p: acc.p + d.targets.p,
      c: acc.c + d.targets.c,
      f: acc.f + d.targets.f,
    }),
    { cals: 0, p: 0, c: 0, f: 0 }
  );

  // Which days are "complete"? (all meals ticked off)
  const completedDayIdxs = weekData
    .map((d, i) =>
      d.touched && d.mealCount > 0 && d.doneIds.length === d.mealCount ? i : -1
    )
    .filter((i) => i !== -1);

  const ringTotals = ringMode === "day" ? dayTotals : weekTotals;
  const ringTargets = ringMode === "day" ? dayTargets : weekTargets;
  const ringHeader =
    ringMode === "day"
      ? `${DAYS[selectedDayIdx]}'s progress`
      : "This week's progress";

  const weekRemaining = weekTargets.cals - weekTotals.cals;
  const isFutureDay = ringMode === "day" && dayMode === "future";
  const isEmptyDay = ringMode === "day" && (dayTotals.cals === 0 || isFutureDay);

  return (
    <div>
      <WeekStrip
        weekKey={weekKey}
        selectedDayIdx={selectedDayIdx}
        completedDayIdxs={completedDayIdxs}
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

      <div style={{ display: "flex", justifyContent: "center", marginBottom: 10 }}>
        <MacroRing
          totals={ringTotals}
          targets={ringTargets}
          size={200}
          empty={isEmptyDay}
          onTap={() => alert("Breakdown panel — coming soon.")}
        />
      </div>

      {!isEmptyDay && (
        <MacroLegend totals={ringTotals} targets={ringTargets} />
      )}

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
