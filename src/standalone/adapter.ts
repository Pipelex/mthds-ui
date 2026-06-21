/**
 * Standalone adapter for embedding GraphViewer in a single HTML file.
 * Mirrors the VS Code extension adapter pattern (module-scoped state + manual re-render).
 *
 * Config parsing lives in `./viewerProps` so it can be unit-tested without a DOM.
 *
 * Theming: the in-graph toolbar is the single theme toggle. The library owns
 * the tri-state (`dark | light | system`) and the `prefers-color-scheme`
 * subscription; this adapter only mirrors the resolved theme onto page chrome
 * (`<body>` palette + `data-theme` for the CSS chrome/logo rules).
 */
import React from "react";
import { createRoot } from "react-dom/client";
import type { GraphTheme, GraphThemeMode } from "@graph/types";
import { validateGraphSpec } from "@graph/validateGraphSpec";
import { GraphViewer, resolveActiveTheme } from "@graph/react/viewer/GraphViewer";
import { getPaletteForTheme } from "@graph/graphConfig";
import { detectSystemTheme } from "@graph/react/viewer/useSystemTheme";
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

/**
 * Apply the theme palette to `document.body` so page chrome rendered outside
 * the GraphViewer container (e.g. the standalone HTML wrapper) themes with
 * the graph. Sparse `paletteColors` overrides win per-key. Takes the resolved
 * binary theme (not the mode).
 */
function applyBodyPalette(theme: GraphTheme, overrides?: Record<string, string>): void {
  const themePalette = getPaletteForTheme(theme);
  const palette = overrides ? { ...themePalette, ...overrides } : themePalette;
  for (const [cssVar, value] of Object.entries(palette)) {
    document.body.style.setProperty(cssVar, value);
  }
}

/**
 * Mirror a (mode, resolvedTheme) onto page chrome:
 * - `body[data-theme]` carries the *mode* so the standalone CSS chrome/logo
 *   rules (including the `system` `prefers-color-scheme` media queries) react.
 * - the body graph palette is set from the *resolved* theme.
 *
 * Called at mount and on every `onThemeChange` from the GraphViewer (toolbar
 * clicks and `system` re-resolving on a system change), keeping body chrome in
 * sync with the chart in all three states.
 */
function applyPageChrome(mode: GraphThemeMode, resolvedTheme: GraphTheme): void {
  document.body.setAttribute("data-theme", mode);
  applyBodyPalette(resolvedTheme, viewerProps.config.paletteColors);
}

// ─── React app ──────────────────────────────────────────────────────────

function App() {
  return React.createElement(GraphViewer, {
    ...viewerProps,
    onThemeChange: (mode: GraphThemeMode, resolvedTheme: GraphTheme) => {
      applyPageChrome(mode, resolvedTheme);
    },
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
    const rawConfig = readJsonScript("pipelex-config");
    const rawGraphspec = readJsonScript("pipelex-graphspec");
    // Validate the embedded spec at the boundary — fail loudly on malformed
    // input rather than rendering fabricated content downstream.
    const graphspec = rawGraphspec === null ? null : validateGraphSpec(rawGraphspec);
    viewerProps = buildViewerProps(rawConfig, graphspec);

    // Paint initial page chrome from the parsed mode. `onThemeChange` does not
    // fire on mount, so resolve `system` here through the same library helper
    // the GraphViewer uses (single source of truth — no parallel copy to drift).
    applyPageChrome(viewerProps.theme, resolveActiveTheme(viewerProps.theme, detectSystemTheme()));

    // Re-render with data (triggers GraphViewer's graphspec useEffect)
    renderApp?.();
  }, 0);
}

// ─── Run ────────────────────────────────────────────────────────────────

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
