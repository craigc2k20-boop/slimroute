import React from "react";

/**
 * TabBar — horizontal segmented control.
 * @param {Array<{id:string,label:string}>} tabs
 * @param {string} active  id of the currently active tab
 * @param {(id:string)=>void} onChange
 */
export default function TabBar({ tabs, active, onChange }) {
  return (
    <div className="tab-bar" role="tablist">
      {tabs.map((t) => (
        <button
          key={t.id}
          role="tab"
          aria-selected={active === t.id}
          className={`tab-btn ${active === t.id ? "active" : ""}`}
          onClick={() => onChange(t.id)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
