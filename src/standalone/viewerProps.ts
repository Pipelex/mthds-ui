/**
 * Pure config parsing for the standalone adapter. Lives in its own module so
 * the wire-through from `pipelex-config` JSON to `GraphViewer` props can be
 * unit-tested without pulling React or CSS side-effects into the test.
 */
import type {
  GraphSpec,
  GraphConfig,
  GraphDirection,
  FoldMode,
  GraphThemeMode,
} from "@graph/types";
import { FOLD_MODE, GRAPH_DIRECTION, GRAPH_THEME_MODE } from "@graph/types";

export interface StandaloneViewerProps {
  graphspec: GraphSpec | null;
  config: GraphConfig;
  initialDirection: GraphDirection;
  initialShowControllers: boolean;
  initialFoldMode: FoldMode;
  theme: GraphThemeMode;
}

/**
 * An absent `foldMode` key legitimately defaults to `expanded`. A *present*
 * but unrecognized value is a malformed config — throw rather than silently
 * coercing, so the host page sees the failure.
 */
function parseFoldMode(raw: unknown): FoldMode {
  if (raw === undefined || raw === null) return FOLD_MODE.EXPANDED;
  if (raw === FOLD_MODE.FOLDED || raw === FOLD_MODE.EXPANDED || raw === FOLD_MODE.AUTO) {
    return raw;
  }
  throw new Error(
    `Invalid foldMode in standalone config: ${JSON.stringify(raw)} — ` +
      `expected one of "folded", "expanded", "auto".`,
  );
}

/**
 * Theme *mode*. The standalone no longer resolves `system` itself — it passes
 * the mode straight through and lets `GraphViewer` (via `useSystemTheme`)
 * resolve it against `prefers-color-scheme`. An absent/null value defaults to
 * `system`, matching `DEFAULT_GRAPH_CONFIG`. A *present* but unrecognized value
 * is a malformed config — throw rather than silently coercing, so the host page
 * sees the failure (the same pattern as `parseFoldMode` / `parseDirection`,
 * which previously `parseTheme` broke by swallowing bad values).
 */
function parseTheme(raw: unknown): GraphThemeMode {
  if (raw === undefined || raw === null) return GRAPH_THEME_MODE.SYSTEM;
  if (
    raw === GRAPH_THEME_MODE.LIGHT ||
    raw === GRAPH_THEME_MODE.DARK ||
    raw === GRAPH_THEME_MODE.SYSTEM
  ) {
    return raw;
  }
  throw new Error(
    `Invalid theme in standalone config: ${JSON.stringify(raw)} — ` +
      `expected one of "dark", "light", "system".`,
  );
}

/**
 * An absent `direction` key legitimately defaults to `LR`. A *present* but
 * unrecognized value is a malformed config — throw rather than silently
 * coercing (a bad direction crashes layout when `portSides[direction]` is
 * undefined).
 */
function parseDirection(raw: unknown): GraphDirection {
  if (raw === undefined || raw === null) return GRAPH_DIRECTION.LR;
  if (
    raw === GRAPH_DIRECTION.LR ||
    raw === GRAPH_DIRECTION.RL ||
    raw === GRAPH_DIRECTION.TB ||
    raw === GRAPH_DIRECTION.BT
  ) {
    return raw;
  }
  throw new Error(
    `Invalid direction in standalone config: ${JSON.stringify(raw)} — ` +
      `expected one of "TB", "BT", "LR", "RL".`,
  );
}

/**
 * Translate the raw `pipelex-config` JSON blob into props for `GraphViewer`.
 *
 * Unknown fields in `rawConfig` are forwarded verbatim (spread) so any future
 * `GraphConfig` key reaches `GraphViewer` without a code change here —
 * eliminating the v0.6.2-shape regression where new fields silently fail to
 * wire through. Validated fields (currently just `foldMode`) override the
 * spread.
 */
export function buildViewerProps(
  rawConfig: unknown,
  graphspec: GraphSpec | null,
): StandaloneViewerProps {
  const cfg = (rawConfig && typeof rawConfig === "object" ? rawConfig : {}) as Record<
    string,
    unknown
  >;
  const direction = parseDirection(cfg.direction);
  const showControllers = Boolean(cfg.showControllers);
  const foldMode = parseFoldMode(cfg.foldMode);
  const theme = parseTheme(cfg.theme);
  return {
    graphspec,
    config: {
      ...cfg,
      direction,
      showControllers,
      foldMode,
      theme,
    } as GraphConfig,
    initialDirection: direction,
    initialShowControllers: showControllers,
    initialFoldMode: foldMode,
    theme,
  };
}
