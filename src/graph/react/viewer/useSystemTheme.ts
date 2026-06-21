/**
 * Resolve the host environment's color scheme to a binary `GraphTheme`.
 *
 * In a browser this follows `prefers-color-scheme` live. Non-browser hosts (a
 * VS Code webview, where `prefers-color-scheme` is historically flaky) stay
 * authoritative by injecting `systemTheme` — the hook then returns it verbatim
 * and re-renders are driven by the host updating that value.
 *
 * Keeping the `matchMedia` logic in a hook (not inline in GraphViewer) mirrors
 * how the standalone isolated it for testing, and lets the pure
 * `detectSystemTheme` seam be unit-tested without rendering.
 */
import React from "react";
import { GRAPH_THEME, type GraphTheme } from "@graph/types";

const PREFERS_DARK_QUERY = "(prefers-color-scheme: dark)";

/** Map a `prefers-color-scheme: dark` match result to a resolved theme. */
export function prefersDarkToTheme(prefersDark: boolean): GraphTheme {
  return prefersDark ? GRAPH_THEME.DARK : GRAPH_THEME.LIGHT;
}

/**
 * Read the environment's current color scheme once. SSR / no-`matchMedia` safe:
 * defaults to `dark` when `window.matchMedia` is unavailable. Exported so
 * non-React callers (e.g. the standalone adapter's initial body-palette paint,
 * before any `onThemeChange` fires) can resolve `auto` the same way the hook does.
 */
export function detectSystemTheme(): GraphTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return GRAPH_THEME.DARK;
  }
  return prefersDarkToTheme(window.matchMedia(PREFERS_DARK_QUERY).matches);
}

function subscribeToSystemTheme(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const mql = window.matchMedia(PREFERS_DARK_QUERY);
  mql.addEventListener("change", onChange);
  return () => mql.removeEventListener("change", onChange);
}

/**
 * Resolved environment theme.
 *
 * - `injected` set → return it (host owns detection; host re-renders drive updates).
 * - otherwise → subscribe to `prefers-color-scheme` and re-render on `change`.
 *
 * Uses `useSyncExternalStore` so the subscription is concurrent-safe and SSR
 * falls back to `dark` via the server snapshot.
 */
export function useSystemTheme(injected?: GraphTheme): GraphTheme {
  const detected = React.useSyncExternalStore(
    subscribeToSystemTheme,
    detectSystemTheme,
    () => GRAPH_THEME.DARK,
  );
  return injected ?? detected;
}
