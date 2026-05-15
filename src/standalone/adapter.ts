/**
 * Standalone adapter for embedding GraphViewer in a single HTML file.
 * Mirrors the VS Code extension adapter pattern (module-scoped state + manual re-render).
 *
 * Config parsing lives in `./viewerProps` so it can be unit-tested without a DOM.
 */
import React from "react";
import { createRoot } from "react-dom/client";
import type { GraphSpec } from "@graph/types";
import { GraphViewer } from "@graph/react/viewer/GraphViewer";
import { buildViewerProps, type StandaloneViewerProps } from "./viewerProps";

// ─── Module-scoped state (same pattern as VS Code extension adapter) ────

let viewerProps: StandaloneViewerProps = buildViewerProps({}, null);
let renderApp: (() => void) | null = null;

// ─── Helpers ────────────────────────────────────────────────────────────

function readJsonScript(id: string): unknown {
  const el = document.getElementById(id);
  if (!el?.textContent) return null;
  try {
    return JSON.parse(el.textContent);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    throw new Error(`Failed to parse JSON from <script id="${id}">: ${message}`);
  }
}

// ─── React app ──────────────────────────────────────────────────────────

function App() {
  return React.createElement(GraphViewer, viewerProps);
}

// ─── Mount + delayed data load (mirrors VS Code postMessage pattern) ────

function mount() {
  const rootEl = document.getElementById("root");
  if (!rootEl) return;

  const root = createRoot(rootEl);

  renderApp = () => {
    root.render(React.createElement(App));
  };

  // Initial render with null graphspec (like VS Code before setData message)
  renderApp();

  // Load data after initial mount (next tick), same as VS Code postMessage arrival
  setTimeout(() => {
    const rawConfig = readJsonScript("pipelex-config");
    const graphspec = readJsonScript("pipelex-graphspec") as GraphSpec | null;
    viewerProps = buildViewerProps(rawConfig, graphspec);

    // Apply palette colors
    const palette = viewerProps.config.paletteColors;
    if (palette) {
      for (const [cssVar, value] of Object.entries(palette)) {
        document.body.style.setProperty(cssVar, value);
      }
    }

    // Re-render with data (triggers GraphViewer's graphspec useEffect)
    renderApp?.();
  }, 0);

  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    const current = document.body.getAttribute("data-theme") || "dark";
    const next = current === "dark" ? "light" : current === "light" ? "system" : "dark";
    document.body.setAttribute("data-theme", next);
    const label = document.getElementById("theme-toggle")?.querySelector(".theme-label");
    if (label) label.textContent = next;
  });
}

// ─── Run ────────────────────────────────────────────────────────────────

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
