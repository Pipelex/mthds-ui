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
 * before any `onThemeChange` fires) can resolve `system` the same way the hook does.
 */
export function detectSystemTheme(): GraphTheme {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return GRAPH_THEME.DARK;
  }
  return prefersDarkToTheme(window.matchMedia(PREFERS_DARK_QUERY).matches);
}

/**
 * Subscribe to `prefers-color-scheme` changes, invoking `onChange` on each flip.
 * Returns an unsubscribe. SSR / no-`matchMedia` safe: returns a no-op.
 *
 * Older WebKit, some Electron builds, and certain VS Code webview hosts expose
 * a `MediaQueryList` with only the legacy `addListener`/`removeListener` API.
 * Calling `addEventListener` unconditionally throws there — and because this
 * runs inside the `useSyncExternalStore` subscribe during render, the throw
 * crashes the whole GraphViewer (blank graph) on exactly the webview host
 * class the `systemTheme` prop exists to support. Prefer the modern API, fall
 * back to the legacy one (mirrors the deleted standalone `pageTheme.ts`).
 *
 * Exported as a pure seam so the modern/legacy/SSR branches can be unit-tested
 * in a node env (no renderer) — see `__tests__/useSystemTheme.test.ts`.
 */
export function subscribeToSystemTheme(onChange: () => void): () => void {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return () => {};
  }
  const mql = window.matchMedia(PREFERS_DARK_QUERY);
  if (typeof mql.addEventListener === "function") {
    mql.addEventListener("change", onChange);
    return () => mql.removeEventListener("change", onChange);
  }
  mql.addListener(onChange);
  return () => mql.removeListener(onChange);
}

/** The `useSyncExternalStore` triple `useSystemTheme` drives. */
export interface SystemThemeStore {
  subscribe: (onChange: () => void) => () => void;
  getSnapshot: () => GraphTheme;
  getServerSnapshot: () => GraphTheme;
}

/**
 * Build the `useSyncExternalStore` triple for a given `injected` value.
 *
 * - `injected` set → host owns detection: `subscribe` is a no-op (no live
 *   `matchMedia` listener is ever registered) and both snapshots return
 *   `injected`. Spending an OS listener + per-render `detectSystemTheme` on a
 *   result we'd discard is pure waste — and wrong to keep alive on the very
 *   webview hosts where `prefers-color-scheme` is unreliable.
 * - otherwise → subscribe to `prefers-color-scheme` live; the server snapshot
 *   falls back to `dark` (see `docs/theming.md` → "SSR").
 *
 * Pure + exported so the injected-skip path is unit-testable without a renderer.
 */
export function systemThemeStore(injected?: GraphTheme): SystemThemeStore {
  if (injected !== undefined) {
    return {
      subscribe: () => () => {},
      getSnapshot: () => injected,
      getServerSnapshot: () => injected,
    };
  }
  return {
    subscribe: subscribeToSystemTheme,
    getSnapshot: detectSystemTheme,
    getServerSnapshot: () => GRAPH_THEME.DARK,
  };
}

/**
 * Resolved environment theme.
 *
 * - `injected` set → return it (host owns detection; host re-renders drive
 *   updates). No live `matchMedia` subscription is registered.
 * - otherwise → subscribe to `prefers-color-scheme` and re-render on `change`.
 *
 * Uses `useSyncExternalStore` so the subscription is concurrent-safe. The hook
 * is always called (rules-of-hooks); only the `systemThemeStore` triple branches
 * on `injected`, memoized so the `subscribe` reference stays stable across
 * renders (no re-subscribe churn). SSR with no injected value falls back to
 * `dark` via the server snapshot — see `docs/theming.md` → "SSR" for the
 * consequence and the recommended `theme` / `systemTheme` pinning.
 */
export function useSystemTheme(injected?: GraphTheme): GraphTheme {
  const store = React.useMemo(() => systemThemeStore(injected), [injected]);
  return React.useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot);
}
