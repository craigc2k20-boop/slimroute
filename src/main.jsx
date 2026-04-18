// ═══════════════════════════════════════════════════════════
// main.jsx — the entry point Vite loads from index.html.
// Kept deliberately tiny: import styles, mount the app, done.
// ═══════════════════════════════════════════════════════════

import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./styles/global.css";

// Minimal error boundary so a single screen bug doesn't white-screen
// the whole app. Real error reporting (Sentry/LogRocket/etc.) can be
// wired in here later.
class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null };
  }
  static getDerivedStateFromError(error) {
    return { error };
  }
  componentDidCatch(error, info) {
    console.error("App crashed:", error, info);
  }
  render() {
    if (this.state.error) {
      return (
        <div className="app-shell">
          <div className="card" style={{ padding: 18 }}>
            <h2 style={{ color: "var(--danger, #ef4444)" }}>Something broke</h2>
            <pre style={{ whiteSpace: "pre-wrap", fontSize: 12, color: "var(--text-2)" }}>
              {String(this.state.error?.message || this.state.error)}
            </pre>
            <button className="btn-primary" onClick={() => window.location.reload()}>
              Reload
            </button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </React.StrictMode>
);
