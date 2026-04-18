// ═══════════════════════════════════════════════════════════
// Profile screen — stub. Will hold user profile (body weight,
// age, height, training schedule, hydration override, etc.)
// and an Admin section shown only for admin users.
// ═══════════════════════════════════════════════════════════

import React from "react";
import Card from "../components/Card.jsx";

export default function Profile() {
  return (
    <Card style={{ padding: 18 }}>
      <h2
        style={{
          fontFamily: "var(--font-display)",
          fontSize: 22,
          marginBottom: 8,
          color: "var(--text-1)",
        }}
      >
        Profile
      </h2>
      <p style={{ color: "var(--text-2)", fontSize: 13, lineHeight: 1.5 }}>
        Profile, training schedule, hydration override, and (for admins) the
        admin panel will live here. Coming in a follow-up session.
      </p>
    </Card>
  );
}
