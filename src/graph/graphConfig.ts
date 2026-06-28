import type { GraphConfig, GraphTheme } from "./types";
import { EDGE_TYPE, FOLD_MODE, GRAPH_THEME, GRAPH_THEME_MODE, TOOLBAR_POSITION } from "./types";

/**
 * Semantic design tokens consumed by every component CSS file.
 *
 * Component CSS **must never** hardcode raw hex/rgba values. Reference these
 * tokens via `var(--token-name)`. A new theme is just a new set of values.
 * A new component picks up theming for free as long as it only uses tokens.
 *
 * Categories:
 *   surface-*   → backgrounds (page, panels, pills, glass overlays)
 *   border-*    → borders, dividers
 *   text-*      → foreground text
 *   shadow-*    → drop shadows
 *   focus-ring  → focus outline
 *   color-*     → domain-semantic colors (pipe accents, edges, status); kept
 *                 separate because they're meaningful in both themes (a pipe is
 *                 still red), only the *value* shifts for contrast.
 */
const FONT_TOKENS: Record<string, string> = {
  "--font-sans": '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
  "--font-mono": '"JetBrains Mono", "Monaco", "Menlo", monospace',
};

export const DARK_PALETTE_COLORS: Record<string, string> = {
  ...FONT_TOKENS,

  // Surfaces
  "--surface-page": "#0a0a0a",
  "--surface-panel": "#111118",
  "--surface-overlay": "rgba(17, 17, 24, 0.8)",
  "--surface-overlay-hover": "rgba(30, 30, 40, 0.9)",
  "--surface-overlay-disabled": "rgba(17, 17, 24, 0.6)",
  "--surface-elevated": "rgba(255, 255, 255, 0.06)",
  "--surface-elevated-hover": "rgba(255, 255, 255, 0.1)",
  "--surface-sunken": "rgba(255, 255, 255, 0.03)",
  "--surface-pill": "rgba(255, 255, 255, 0.06)",
  "--surface-pill-border": "rgba(255, 255, 255, 0.08)",

  // Borders
  "--border-subtle": "rgba(255, 255, 255, 0.06)",
  "--border-default": "rgba(255, 255, 255, 0.1)",
  "--border-strong": "rgba(255, 255, 255, 0.18)",
  "--border-dashed": "rgba(255, 255, 255, 0.15)",

  // Text
  "--text-primary": "#f8fafc",
  "--text-default": "#e2e8f0",
  "--text-secondary": "#cbd5e1",
  "--text-muted": "#94a3b8",
  "--text-dim": "#64748b",
  "--text-on-accent": "#0e0e0e",

  // Effects
  "--shadow-sm": "0 2px 8px rgba(0, 0, 0, 0.4)",
  "--shadow-md": "0 4px 16px rgba(0, 0, 0, 0.6)",
  "--shadow-lg": "0 8px 24px rgba(0, 0, 0, 0.5)",
  "--focus-ring": "rgba(59, 130, 246, 0.6)",

  // Domain-semantic colors (graph nodes/edges)
  "--color-pipe": "#ff6b6b",
  "--color-pipe-bg": "rgba(224,108,117,0.18)",
  "--color-pipe-text": "#ffffff",
  "--color-stuff": "#4ECDC4",
  "--color-stuff-bg": "rgba(78,205,196,0.12)",
  "--color-stuff-border": "#9ddcfd",
  "--color-stuff-text": "#98FB98",
  "--color-stuff-text-dim": "#9ddcfd",
  "--color-edge": "#FFFACD",
  "--color-batch-item": "#bd93f9",
  "--color-batch-aggregate": "#50fa7b",
  "--color-parallel-combine": "#d6a4ff",
  "--color-success": "#50FA7B",
  "--color-success-bg": "rgba(80,250,123,0.15)",
  "--color-error": "#FF5555",
  "--color-error-bg": "rgba(255,85,85,0.15)",
  "--color-error-border": "rgba(255,85,85,0.2)",
  "--color-accent": "#8BE9FD",
  "--color-accent-strong": "#3b82f6",
  "--color-warning": "#FFB86C",

  // Controller-group palette (tinted borders/backgrounds per controller type)
  "--ctrl-sequence-border": "rgba(148, 163, 184, 0.25)",
  "--ctrl-sequence-bg": "rgba(148, 163, 184, 0.03)",
  "--ctrl-sequence-text": "#94a3b8",
  "--ctrl-parallel-border": "rgba(139, 233, 253, 0.35)",
  "--ctrl-parallel-bg": "rgba(139, 233, 253, 0.03)",
  "--ctrl-parallel-text": "#8be9fd",
  "--ctrl-condition-border": "rgba(251, 191, 36, 0.35)",
  "--ctrl-condition-bg": "rgba(251, 191, 36, 0.03)",
  "--ctrl-condition-text": "#fbbf24",
  "--ctrl-batch-border": "rgba(167, 139, 250, 0.35)",
  "--ctrl-batch-bg": "rgba(167, 139, 250, 0.03)",
  "--ctrl-batch-text": "#a78bfa",
  "--ctrl-folded-bg": "rgba(148, 163, 184, 0.25)",
  "--ctrl-folded-border": "rgba(148, 163, 184, 0.4)",

  // Legacy aliases — kept so existing inline styles in graph builders keep
  // working until they're migrated. New code should use the semantic tokens.
  "--color-bg": "#0a0a0a",
  "--color-bg-dots": "rgba(255, 255, 255, 0.35)",
  "--color-text-muted": "#94a3b8",
  "--color-controller-text": "#94a3b8",
};

export const LIGHT_PALETTE_COLORS: Record<string, string> = {
  ...FONT_TOKENS,

  // Surfaces — chart stays a soft off-white, panels slightly cooler
  "--surface-page": "#f8fafc",
  "--surface-panel": "#ffffff",
  "--surface-overlay": "rgba(255, 255, 255, 0.92)",
  "--surface-overlay-hover": "rgba(241, 245, 249, 0.96)",
  "--surface-overlay-disabled": "rgba(255, 255, 255, 0.7)",
  "--surface-elevated": "rgba(15, 23, 42, 0.05)",
  "--surface-elevated-hover": "rgba(15, 23, 42, 0.09)",
  "--surface-sunken": "rgba(15, 23, 42, 0.03)",
  "--surface-pill": "rgba(15, 23, 42, 0.05)",
  "--surface-pill-border": "rgba(15, 23, 42, 0.1)",

  // Borders
  "--border-subtle": "rgba(15, 23, 42, 0.08)",
  "--border-default": "rgba(15, 23, 42, 0.12)",
  "--border-strong": "rgba(15, 23, 42, 0.22)",
  "--border-dashed": "rgba(15, 23, 42, 0.18)",

  // Text
  "--text-primary": "#020617",
  "--text-default": "#0f172a",
  "--text-secondary": "#1e293b",
  "--text-muted": "#475569",
  "--text-dim": "#64748b",
  "--text-on-accent": "#ffffff",

  // Effects
  "--shadow-sm": "0 2px 8px rgba(15, 23, 42, 0.08)",
  "--shadow-md": "0 4px 16px rgba(15, 23, 42, 0.14)",
  "--shadow-lg": "0 8px 24px rgba(15, 23, 42, 0.15)",
  "--focus-ring": "rgba(2, 132, 199, 0.5)",

  // Domain-semantic colors — darker for contrast on light backgrounds
  "--color-pipe": "#dc2626",
  "--color-pipe-bg": "rgba(220, 38, 38, 0.1)",
  "--color-pipe-text": "#ffffff",
  "--color-stuff": "#0891b2",
  "--color-stuff-bg": "rgba(8, 145, 178, 0.08)",
  "--color-stuff-border": "#0e7490",
  "--color-stuff-text": "#0f172a",
  "--color-stuff-text-dim": "#475569",
  "--color-edge": "#64748b",
  "--color-batch-item": "#7c3aed",
  "--color-batch-aggregate": "#15803d",
  "--color-parallel-combine": "#6d28d9",
  "--color-success": "#15803d",
  "--color-success-bg": "rgba(21, 128, 61, 0.12)",
  "--color-error": "#dc2626",
  "--color-error-bg": "rgba(220, 38, 38, 0.1)",
  "--color-error-border": "rgba(220, 38, 38, 0.25)",
  "--color-accent": "#0284c7",
  "--color-accent-strong": "#0284c7",
  "--color-warning": "#d97706",

  // Controller-group palette
  "--ctrl-sequence-border": "rgba(71, 85, 105, 0.3)",
  "--ctrl-sequence-bg": "rgba(71, 85, 105, 0.04)",
  "--ctrl-sequence-text": "#475569",
  "--ctrl-parallel-border": "rgba(8, 145, 178, 0.4)",
  "--ctrl-parallel-bg": "rgba(8, 145, 178, 0.05)",
  "--ctrl-parallel-text": "#0e7490",
  "--ctrl-condition-border": "rgba(217, 119, 6, 0.4)",
  "--ctrl-condition-bg": "rgba(217, 119, 6, 0.05)",
  "--ctrl-condition-text": "#b45309",
  "--ctrl-batch-border": "rgba(124, 58, 237, 0.4)",
  "--ctrl-batch-bg": "rgba(124, 58, 237, 0.05)",
  "--ctrl-batch-text": "#6d28d9",
  "--ctrl-folded-bg": "rgba(71, 85, 105, 0.18)",
  "--ctrl-folded-border": "rgba(71, 85, 105, 0.35)",

  // Legacy aliases
  "--color-bg": "#f8fafc",
  "--color-bg-dots": "rgba(15, 23, 42, 0.18)",
  "--color-text-muted": "#475569",
  "--color-controller-text": "#475569",
};

export function getPaletteForTheme(theme: GraphTheme): Record<string, string> {
  return theme === GRAPH_THEME.LIGHT ? LIGHT_PALETTE_COLORS : DARK_PALETTE_COLORS;
}

export const DEFAULT_GRAPH_CONFIG: GraphConfig = {
  direction: "LR",
  showControllers: false,
  foldMode: FOLD_MODE.EXPANDED,
  // `system` follows the host environment (OS/browser, or editor theme) out of
  // the box — the least-surprising default for an embedded component. Hosts
  // that want a fixed appearance pass `theme: "dark"` / `"light"` explicitly.
  theme: GRAPH_THEME_MODE.SYSTEM,
  // Backward-compatible default: the toolbar stays pinned top-right unless the
  // host overrides it via `config.toolbarPosition` or the `toolbarPosition` prop.
  toolbarPosition: TOOLBAR_POSITION.TOP_RIGHT,
  nodesep: 50,
  ranksep: 100,
  edgeType: EDGE_TYPE.DEFAULT,
  initialZoom: null,
  panToTop: true,
  // `paletteColors` intentionally omitted from the default. The viewer derives
  // the palette from the active `theme`. Consumers only set `paletteColors` to
  // override specific tokens (sparse merge on top of the theme palette).
};

export function getPaletteColors(): Record<string, string> {
  return DARK_PALETTE_COLORS;
}
