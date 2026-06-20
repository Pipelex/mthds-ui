/**
 * Standalone adapter for embedding GraphViewer in a single HTML file.
 * Mirrors the VS Code extension adapter pattern (module-scoped state + manual re-render).
 *
 * Config parsing lives in `./viewerProps` so it can be unit-tested without a DOM.
 */
import React from "react";
import { createRoot } from "react-dom/client";
import type { GraphTheme } from "@graph/types";
import { validateGraphSpec } from "@graph/validateGraphSpec";
import { GraphViewer } from "@graph/react/viewer/GraphViewer";
import { getPaletteForTheme } from "@graph/graphConfig";
import { buildViewerProps, type StandaloneViewerProps } from "./viewerProps";
import { type PageTheme, nextPageTheme, resolvePageThemeToGraphTheme } from "./pageTheme";

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
 * the graph. Sparse `paletteColors` overrides win per-key.
 *
 * Called both at initial mount AND on every theme change emitted by
 * GraphViewer (via `onThemeChange`) — otherwise toggling the toolbar's theme
 * button would only re-skin the chart container while leaving body chrome
 * stuck on the initial palette.
 */
function applyBodyPalette(theme: GraphTheme, overrides?: Record<string, string>): void {
  const themePalette = getPaletteForTheme(theme);
  const palette = overrides ? { ...themePalette, ...overrides } : themePalette;
  for (const [cssVar, value] of Object.entries(palette)) {
    document.body.style.setProperty(cssVar, value);
  }
}

// ─── React app ──────────────────────────────────────────────────────────

function App() {
  return React.createElement(GraphViewer, {
    ...viewerProps,
    onThemeChange: (nextTheme) => {
      applyBodyPalette(nextTheme, viewerProps.config.paletteColors);
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

    applyBodyPalette(viewerProps.theme, viewerProps.config.paletteColors);

    // Re-render with data (triggers GraphViewer's graphspec useEffect)
    renderApp?.();
  }, 0);

  const prefersDark = (): boolean =>
    typeof window !== "undefined" &&
    typeof window.matchMedia === "function" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;

  // Sync the GraphViewer + body palette + page chrome to a page-level theme
  // state. Replaces the prior toggle which only updated body[data-theme] and
  // the label — the graph kept its initial theme, so the page and chart
  // could drift out of sync (PR-41 greptile P1: "Standalone toggle desyncs").
  const applyPageTheme = (next: PageTheme): void => {
    document.body.setAttribute("data-theme", next);
    const label = document.getElementById("theme-toggle")?.querySelector(".theme-label");
    if (label) label.textContent = next;

    const graphTheme = resolvePageThemeToGraphTheme(next, prefersDark);
    viewerProps = { ...viewerProps, theme: graphTheme };
    applyBodyPalette(graphTheme, viewerProps.config.paletteColors);
    renderApp?.();
  };

  document.getElementById("theme-toggle")?.addEventListener("click", () => {
    applyPageTheme(nextPageTheme(document.body.getAttribute("data-theme")));
  });

  // Track system preference changes so a "system" selection stays live.
  if (typeof window !== "undefined" && typeof window.matchMedia === "function") {
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const handler = () => {
      if (document.body.getAttribute("data-theme") === "system") {
        applyPageTheme("system");
      }
    };
    if (typeof mq.addEventListener === "function") {
      mq.addEventListener("change", handler);
    }
  }
}

// ─── Run ────────────────────────────────────────────────────────────────

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
