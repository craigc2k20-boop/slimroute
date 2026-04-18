// ═══════════════════════════════════════════════════════════
// BottomTabBar — persistent iOS/Android-style bottom navigation.
// Four slots: Home · Meals · Ingredients · Profile.
//
// Outer wrapper spans full viewport (so the backdrop-blur reaches
// the edges on phone screens), but the inner row of icons is
// capped at 640px and centred — matching the app's content width.
// This keeps all four icons visible regardless of screen size.
// ═══════════════════════════════════════════════════════════

import React from "react";

const iconBase = { width: 22, height: 22, display: "block" };

const ICONS = {
  home: (active) => (
    <svg viewBox="0 0 24 24" style={iconBase} fill="none" stroke={active ? "#22d3ee" : "#64748b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M3 12 12 3l9 9" /><path d="M5 10v10h14V10" />
    </svg>
  ),
  meals: (active) => (
    <svg viewBox="0 0 24 24" style={iconBase} fill="none" stroke={active ? "#22d3ee" : "#64748b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 3v7a4 4 0 0 0 4 4v7" /><path d="M8 3v7" /><path d="M16 3c-2 1-3 3-3 6s1 4 3 4v8" />
    </svg>
  ),
  ings: (active) => (
    <svg viewBox="0 0 24 24" style={iconBase} fill="none" stroke={active ? "#22d3ee" : "#64748b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 6h14" /><path d="M5 12h14" /><path d="M5 18h14" /><circle cx="7" cy="6" r="1" fill={active ? "#22d3ee" : "#64748b"} /><circle cx="11" cy="12" r="1" fill={active ? "#22d3ee" : "#64748b"} /><circle cx="15" cy="18" r="1" fill={active ? "#22d3ee" : "#64748b"} />
    </svg>
  ),
  profile: (active) => (
    <svg viewBox="0 0 24 24" style={iconBase} fill="none" stroke={active ? "#22d3ee" : "#64748b"} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" />
    </svg>
  ),
};

const TABS = [
  { id: "home", label: "Home" },
  { id: "meals", label: "Meals" },
  { id: "ings", label: "Ingredients" },
  { id: "profile", label: "Profile" },
];

export default function BottomTabBar({ active, onChange }) {
  return (
    <nav
      role="tablist"
      aria-label="Main navigation"
      style={{
        // Outer: full-width backdrop so blur reaches edges on phones
        position: "fixed",
        left: 0,
        right: 0,
        bottom: 0,
        zIndex: 50,
        background: "rgba(10,15,30,0.88)",
        backdropFilter: "blur(24px)",
        WebkitBackdropFilter: "blur(24px)",
        borderTop: "1px solid rgba(148,163,184,0.1)",
        paddingBottom: "env(safe-area-inset-bottom)",
      }}
    >
      <div
        style={{
          // Inner: capped & centred so icons align with content column
          maxWidth: 640,
          margin: "0 auto",
          padding: "6px 8px",
          display: "grid",
          gridTemplateColumns: "repeat(4, 1fr)",
        }}
      >
        {TABS.map((t) => {
          const isActive = active === t.id;
          return (
            <button
              key={t.id}
              role="tab"
              aria-selected={isActive}
              onClick={() => onChange(t.id)}
              style={{
                background: "transparent",
                border: "none",
                color: isActive ? "#22d3ee" : "#64748b",
                fontSize: 10,
                fontWeight: 600,
                letterSpacing: 0.3,
                padding: "6px 0 4px",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                gap: 3,
                cursor: "pointer",
                fontFamily: "var(--font-sans)",
              }}
            >
              {ICONS[t.id](isActive)}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}
