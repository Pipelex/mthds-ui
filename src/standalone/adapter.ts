/**
 * Standalone adapter for embedding GraphViewer in a single HTML file.
 * Mirrors the VS Code extension adapter pattern (module-scoped state + manual re-render).
 */
import React from "react";
import { createRoot } from "react-dom/client";
import type { GraphSpec, GraphConfig, GraphDirection } from "@graph/types";
import { GRAPH_DIRECTION } from "@graph/types";
import { GraphViewer } from "@graph/react/viewer/GraphViewer";

// ─── Module-scoped state (same pattern as VS Code extension adapter) ────

let currentGraphspec: GraphSpec | null = null;
let currentConfig: GraphConfig = {};
let currentDirection: GraphDirection = GRAPH_DIRECTION.LR;
let currentShowControllers = false;
let renderApp: (() => void) | null = null;

// ─── Helpers ────────────────────────────────────────────────────────────

function readJsonScript(id: string): any {
  const el = document.getElementById(id);
  if (!el?.textContent) return null;
  try {
    return JSON.parse(el.textContent);
  } catch {
    return null;
  }
}

// ─── React app ──────────────────────────────────────────────────────────

function App() {
  return React.createElement(GraphViewer, {
    graphspec: currentGraphspec,
    config: currentConfig,
    initialDirection: currentDirection,
    initialShowControllers: currentShowControllers,
  });
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
    const rawConfig = readJsonScript("pipelex-config") || {};

    currentGraphspec = readJsonScript("pipelex-graphspec") as GraphSpec | null;
    currentDirection = (rawConfig.direction as GraphDirection) || GRAPH_DIRECTION.LR;
    currentShowControllers = rawConfig.showControllers || false;
    currentConfig = {
      direction: currentDirection,
      showControllers: currentShowControllers,
      nodesep: rawConfig.nodesep,
      ranksep: rawConfig.ranksep,
      edgeType: rawConfig.edgeType,
      initialZoom: rawConfig.initialZoom,
      panToTop: rawConfig.panToTop,
      paletteColors: rawConfig.paletteColors,
    };

    // Apply palette colors
    if (rawConfig.paletteColors) {
      for (const [cssVar, value] of Object.entries(rawConfig.paletteColors)) {
        document.body.style.setProperty(cssVar, value as string);
      }
    }

    // Re-render with data (triggers GraphViewer's graphspec useEffect)
    if (renderApp) renderApp();
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
