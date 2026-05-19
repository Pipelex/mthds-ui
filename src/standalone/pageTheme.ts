/**
 * Page-level theme state for the standalone HTML wrapper.
 *
 * The wrapper page exposes a tri-state `data-theme` attribute on `<body>`:
 *   "dark" → "light" → "system" → "dark" → ...
 * The GraphViewer library only understands binary `GraphTheme` ("dark" | "light").
 * `"system"` is resolved at runtime via `prefers-color-scheme`.
 *
 * Pure functions so the standalone toggle behavior is unit-testable without
 * a DOM (matchMedia is injected).
 */
import { GRAPH_THEME, type GraphTheme } from "@graph/types";

export type PageTheme = "dark" | "light" | "system";

const CYCLE: readonly PageTheme[] = ["dark", "light", "system"];

export function isPageTheme(value: unknown): value is PageTheme {
  return value === "dark" || value === "light" || value === "system";
}

/** Next state in the dark → light → system → dark cycle. */
export function nextPageTheme(current: string | null | undefined): PageTheme {
  const safe: PageTheme = isPageTheme(current) ? current : "dark";
  const idx = CYCLE.indexOf(safe);
  return CYCLE[(idx + 1) % CYCLE.length];
}

/**
 * Resolve a page tri-state to a `GraphTheme` the library consumes. The
 * `prefersDark` injection point lets tests skip the DOM dependency.
 */
export function resolvePageThemeToGraphTheme(
  page: PageTheme,
  prefersDark: () => boolean,
): GraphTheme {
  if (page === "dark") return GRAPH_THEME.DARK;
  if (page === "light") return GRAPH_THEME.LIGHT;
  return prefersDark() ? GRAPH_THEME.DARK : GRAPH_THEME.LIGHT;
}
