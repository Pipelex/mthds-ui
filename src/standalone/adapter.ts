/**
 * Standalone adapter for embedding GraphViewer in a single HTML file.
 * Mirrors the VS Code extension adapter pattern (module-scoped state + manual re-render).
 *
 * The embeds are turned into props by `./loadEmbeds` (config parsing in
 * `./viewerProps`), so the whole load can be unit-tested without a DOM. A page
 * embeds either a GraphSpec (`pipelex-graphspec`) or the method's `.mthds`
 * files (`mthds-sources`), from which the static graph is built in the browser.
 *
 * Theming: the in-graph toolbar is the single theme toggle. The library owns
 * the tri-state (`dark | light | system`) and the `prefers-color-scheme`
 * subscription; this adapter only mirrors the resolved theme onto page chrome
 * (`<body>` palette + `data-theme` for the CSS chrome/logo rules).
 */
import React from "react";
import { createRoot } from "react-dom/client";
import type { GraphTheme, GraphThemeMode } from "@graph/types";
import { GraphViewer, resolveActiveTheme } from "@graph/react/viewer/GraphViewer";
import { getPaletteForTheme } from "@graph/graphConfig";
import { detectSystemTheme } from "@graph/react/viewer/useSystemTheme";
import { buildViewerProps, type StandaloneViewerProps } from "./viewerProps";
import { EMBED_ID, loadStandaloneEmbeds } from "./loadEmbeds";

// ─── Module-scoped state (same pattern as VS Code extension adapter) ────

let viewerProps: StandaloneViewerProps = buildViewerProps({}, null);
let renderApp: (() => void) | null = null;

// ─── Helpers ────────────────────────────────────────────────────────────

function readEmbedText(id: string): string | null {
  return document.getElementById(id)?.textContent ?? null;
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

/**
 * Visible fallback for a malformed embedded config, spec or method. The loader
 * throws by design so the failure surfaces — but the data load runs in a
 * detached `setTimeout` callback, where an uncaught throw would silently abort
 * and leave the placeholder first render blank. Styled with explicit colors
 * (not the `--chrome-*` vars) so it stays legible even when the failure is the
 * theme parse itself.
 */
function ErrorScreen({ message }: { message: string }) {
  return React.createElement(
    "div",
    { className: "standalone-error", role: "alert" },
    React.createElement(
      "strong",
      { className: "standalone-error-title" },
      "Failed to render method graph",
    ),
    React.createElement("pre", { className: "standalone-error-message" }, message),
  );
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
    try {
      viewerProps = loadStandaloneEmbeds({
        config: readEmbedText(EMBED_ID.CONFIG),
        graphspec: readEmbedText(EMBED_ID.GRAPHSPEC),
        mthdsSources: readEmbedText(EMBED_ID.MTHDS_SOURCES),
      });

      // Paint initial page chrome from the parsed mode. `onThemeChange` does not
      // fire on mount, so resolve `system` here through the same library helper
      // the GraphViewer uses (single source of truth — no parallel copy to drift).
      applyPageChrome(
        viewerProps.theme,
        resolveActiveTheme(viewerProps.theme, detectSystemTheme()),
      );

      // Re-render with data (triggers GraphViewer's graphspec useEffect)
      renderApp?.();
    } catch (err) {
      // The loader throws on malformed embedded input (a bad theme/direction/
      // foldMode token, invalid JSON, a failed GraphSpec check, a malformed
      // sources embed) and the static builder can throw on hostile input.
      // That is intentional — but this callback is detached on a timer, so an
      // uncaught throw aborts here and leaves the placeholder first render blank
      // with no signal. Surface the failure in the UI instead.
      const message = err instanceof Error ? err.message : String(err);
      root.render(React.createElement(ErrorScreen, { message }));
    }
  }, 0);
}

// ─── Run ────────────────────────────────────────────────────────────────

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", mount);
} else {
  mount();
}
