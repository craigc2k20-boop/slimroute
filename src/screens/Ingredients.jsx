// ═══════════════════════════════════════════════════════════
// Ingredients screen — stub. Will be ported from the legacy App()
// function in a follow-up session, one screen at a time.
// For now it renders a placeholder so the shell is navigable.
// ═══════════════════════════════════════════════════════════

import React from "react";
import Card from "../components/Card.jsx";

export default function Ingredients() {
  return (
    <Card style={{ padding: 18 }}>
      <h2 style={{
        fontFamily: "var(--font-display)",
        fontSize: 22,
        marginBottom: 8,
        color: "var(--text-1)",
      }}>
        Ingredients
      </h2>
      <p style={{ color: "var(--text-2)", fontSize: 13, lineHeight: 1.5 }}>
        This screen will be migrated from the legacy app. The engine
        logic it depends on (macro math, constraints) is already ported and
        unit-tested in <code>src/lib/</code>.
      </p>
    </Card>
  );
}
