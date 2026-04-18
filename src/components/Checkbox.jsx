import React from "react";

export default function Checkbox({ checked, onChange, label, disabled = false }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={checked}
      aria-label={label}
      disabled={disabled}
      className={`chk ${checked ? "on" : ""}`}
      onClick={() => onChange?.(!checked)}
    >
      {checked ? "✓" : ""}
    </button>
  );
}
