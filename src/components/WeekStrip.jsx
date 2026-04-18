// ═══════════════════════════════════════════════════════════
// WeekStrip — the shared chrome at the top of Home & Meals.
//
//   < 13 Apr — 19 Apr [Today] >
//   [Mon][Tue][Wed][Thu][Fri][Sat][Sun]
//
// "Today" button only appears when the visible week isn't the
// current week; tapping it jumps to today's week and selects
// today's day card in one action.
// ═══════════════════════════════════════════════════════════

import React from "react";
import { DS } from "../lib/constants.js";
import { wk, wkD, fmt, lds } from "../lib/date.js";

export default function WeekStrip({
  weekKey,
  selectedDayIdx,
  completedDayIdxs = [],
  onSelectDay,
  onShiftWeek,
  onJumpToToday,
}) {
  const weekDates = wkD(weekKey);

  // Is this the current week?
  const todaysWeekKey = wk(new Date());
  const isCurrentWeek = weekKey === todaysWeekKey;

  return (
    <div style={{ marginBottom: 14 }}>
      {/* Row 1 — prev arrow · week range + today pill · next arrow */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 10,
          gap: 8,
        }}
      >
        <NavArrow dir="prev" onClick={() => onShiftWeek(-1)} />
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            flex: 1,
            justifyContent: "center",
          }}
        >
          <div
            style={{
              fontFamily: "var(--font-display)",
              fontSize: 15,
              color: "var(--text-1)",
              whiteSpace: "nowrap",
            }}
          >
            {fmt(weekDates[0])} — {fmt(weekDates[6])}
          </div>
          {!isCurrentWeek && (
            <button onClick={onJumpToToday} style={todayBtnStyle}>
              Today
            </button>
          )}
        </div>
        <NavArrow dir="next" onClick={() => onShiftWeek(1)} />
      </div>

      {/* Row 2 — 7 day cards */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 4,
        }}
      >
        {weekDates.map((d, i) => (
          <DayCard
            key={i}
            day={DS[i]}
            date={d.getDate()}
            selected={i === selectedDayIdx}
            completed={completedDayIdxs.includes(i)}
            isToday={lds(d) === lds(new Date())}
            onTap={() => onSelectDay(i)}
          />
        ))}
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Subcomponents
// ═══════════════════════════════════════════════════════════

function NavArrow({ dir, onClick }) {
  return (
    <button
      onClick={onClick}
      aria-label={dir === "prev" ? "Previous week" : "Next week"}
      style={{
        width: 30,
        height: 30,
        borderRadius: 8,
        background: "rgba(30,41,59,0.4)",
        border: "1px solid rgba(148,163,184,0.08)",
        color: "var(--text-2)",
        cursor: "pointer",
        fontSize: 14,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {dir === "prev" ? "‹" : "›"}
    </button>
  );
}

function DayCard({ day, date, selected, completed, isToday, onTap }) {
  return (
    <button
      onClick={onTap}
      aria-pressed={selected}
      style={{
        background: "rgba(30,41,59,0.35)",
        border: selected
          ? "1.5px solid #22d3ee"
          : isToday
          ? "1px solid rgba(34, 211, 238, 0.35)"
          : "1px solid rgba(148,163,184,0.10)",
        borderRadius: 9,
        padding: "5px 2px 6px",
        cursor: "pointer",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 1,
        color: "var(--text-1)",
        fontFamily: "var(--font-sans)",
        boxShadow: selected ? "0 0 8px rgba(34,211,238,0.15)" : "none",
        transition: "border-color .15s, box-shadow .15s",
      }}
    >
      <span
        style={{
          fontSize: 9,
          letterSpacing: 1,
          color: selected ? "#22d3ee" : "var(--text-3)",
          fontWeight: 700,
        }}
      >
        {day}
      </span>
      <span style={{ fontSize: 14, fontWeight: 600 }}>{date}</span>
      {completed ? (
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: "50%",
            background: "#22c55e",
            marginTop: 2,
          }}
        />
      ) : (
        <span style={{ height: 8, marginTop: 2 }} />
      )}
    </button>
  );
}

const todayBtnStyle = {
  background: "rgba(34, 211, 238, 0.12)",
  border: "1px solid rgba(34, 211, 238, 0.3)",
  color: "#22d3ee",
  borderRadius: 12,
  padding: "3px 10px",
  fontSize: 10,
  fontWeight: 700,
  letterSpacing: 0.5,
  cursor: "pointer",
  fontFamily: "var(--font-sans)",
  textTransform: "uppercase",
};
