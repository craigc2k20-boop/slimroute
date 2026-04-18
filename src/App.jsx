// ═══════════════════════════════════════════════════════════
// App — the shell. Holds shared state (selected week + day)
// that Home and Meals both read, plus auth + tab routing.
// Week state lives HERE (not inside Home) so it's preserved
// when the user switches tabs.
// ═══════════════════════════════════════════════════════════

import React, { useState } from "react";
import BottomTabBar from "./components/BottomTabBar.jsx";
import { useAuth } from "./hooks/useAuth.js";
import { wk } from "./lib/date.js";

import Home from "./screens/Home.jsx";
import Meals from "./screens/Meals.jsx";
import Ingredients from "./screens/Ingredients.jsx";
import Profile from "./screens/Profile.jsx";

// Monday = 0, Sunday = 6
function todayIndex() {
  const dy = new Date().getDay();
  return dy === 0 ? 6 : dy - 1;
}

export default function App() {
  const [tab, setTab] = useState("home");

  // ── Shared week/day state ────────────────────────────────
  const [weekKey, setWeekKey] = useState(() => wk(new Date()));
  const [selectedDayIdx, setSelectedDayIdx] = useState(todayIndex);

  const { user, loading, signIn, signOut } = useAuth();

  // Navigation helpers wired into WeekStrip by child screens
  const shiftWeek = (dir) => {
    const d = new Date(weekKey + "T12:00:00");
    d.setDate(d.getDate() + dir * 7);
    setWeekKey(wk(d));
  };
  const jumpToToday = () => {
    setWeekKey(wk(new Date()));
    setSelectedDayIdx(todayIndex());
  };

  const weekNav = {
    weekKey,
    selectedDayIdx,
    onSelectDay: setSelectedDayIdx,
    onShiftWeek: shiftWeek,
    onJumpToToday: jumpToToday,
  };

  if (loading) {
    return (
      <div className="app-shell">
        <div className="splash">Loading…</div>
      </div>
    );
  }

  return (
    <div className="app-shell" style={{ paddingBottom: 88 }}>
      <Header
        tab={tab}
        onHome={() => setTab("home")}
        user={user}
        signIn={signIn}
        signOut={signOut}
      />
      <Screen tab={tab} setTab={setTab} weekNav={weekNav} />
      <BottomTabBar active={tab} onChange={setTab} />
    </div>
  );
}

// ═══════════════════════════════════════════════════════════
// Header — app bar at the top of every screen.
// ═══════════════════════════════════════════════════════════

function Header({ tab, onHome, user, signIn, signOut }) {
  return (
    <header
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 12,
        gap: 8,
        minHeight: 34,
      }}
    >
      {tab === "home" ? (
        <h1
          style={{
            fontFamily: "var(--font-display)",
            fontSize: 20,
            color: "var(--text-1)",
            letterSpacing: "-0.5px",
            margin: 0,
          }}
        >
          SlimRoute
        </h1>
      ) : (
        <button
          onClick={onHome}
          aria-label="Back to home"
          style={{
            display: "flex",
            alignItems: "center",
            gap: 6,
            background: "rgba(30,41,59,0.4)",
            border: "1px solid rgba(148,163,184,0.1)",
            borderRadius: 8,
            padding: "6px 10px",
            color: "var(--text-2)",
            fontSize: 12,
            fontWeight: 600,
            cursor: "pointer",
            fontFamily: "var(--font-sans)",
          }}
        >
          <HomeIcon />
          Home
        </button>
      )}

      {user ? (
        <button
          className="btn-ghost"
          onClick={signOut}
          title={user.email || user.displayName}
        >
          {user.displayName?.split(" ")[0] || "Sign out"}
        </button>
      ) : (
        <button className="btn-primary" onClick={signIn}>
          Sign in
        </button>
      )}
    </header>
  );
}

function HomeIcon() {
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
      <path d="M3 12 12 3l9 9" />
      <path d="M5 10v10h14V10" />
    </svg>
  );
}

// ═══════════════════════════════════════════════════════════
// Screen — thin switch, passes weekNav down to screens that need it
// ═══════════════════════════════════════════════════════════

function Screen({ tab, setTab, weekNav }) {
  switch (tab) {
    case "home":
      return <Home weekNav={weekNav} onOpenMeals={() => setTab("meals")} />;
    case "meals":
      return <Meals weekNav={weekNav} />;
    case "ings":
      return <Ingredients />;
    case "profile":
      return <Profile />;
    default:
      return <Home weekNav={weekNav} onOpenMeals={() => setTab("meals")} />;
  }
}
