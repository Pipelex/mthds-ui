import React from "react";
import "./GraphToolbar.css";
import {
  GRAPH_DIRECTION,
  GRAPH_THEME_MODE,
  type GraphDirection,
  type GraphThemeMode,
} from "@graph/types";

export interface GraphToolbarProps {
  direction: GraphDirection;
  onDirectionChange: (direction: GraphDirection) => void;
  showControllers: boolean;
  onShowControllersChange: (showControllers: boolean) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  /** Fold every controller to a card. Renders the fold-all section when set. */
  onFoldAll?: () => void;
  /** Expand every folded controller. Renders the fold-all section when set. */
  onExpandAll?: () => void;
  /** Disable the fold-all button (e.g. everything already folded). */
  foldAllDisabled?: boolean;
  /** Disable the expand-all button (e.g. nothing currently folded). */
  expandAllDisabled?: boolean;
  /** Current theme mode. Renders the theme toggle when both this and `onThemeModeChange` are set. */
  themeMode?: GraphThemeMode;
  /** Theme mode change handler. Renders the theme toggle when both this and `themeMode` are set. */
  onThemeModeChange?: (mode: GraphThemeMode) => void;
  /** Pixel offset from the right edge (e.g. detail panel width when open). */
  rightOffset?: number;
}

const ARROW_RIGHT_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const ARROW_DOWN_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </svg>
);

const MINUS_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const PLUS_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const FIT_VIEW_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

const BOXES_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M2.97 12.92A2 2 0 0 0 2 14.63v3.24a2 2 0 0 0 .97 1.71l3 1.8a2 2 0 0 0 2.06 0L12 19v-5.5l-5-3-4.03 2.42Z" />
    <path d="m7 16.5-4.74-2.85" />
    <path d="m7 16.5 5-3" />
    <path d="M7 16.5v5.17" />
    <path d="M12 13.5V19l3.97 2.38a2 2 0 0 0 2.06 0l3-1.8a2 2 0 0 0 .97-1.71v-3.24a2 2 0 0 0-.97-1.71L17 10.5l-5 3Z" />
    <path d="m17 16.5-5-3" />
    <path d="m17 16.5 4.74-2.85" />
    <path d="M17 16.5v5.17" />
    <path d="M7.97 4.42A2 2 0 0 0 7 6.13v4.37l5 3 5-3V6.13a2 2 0 0 0-.97-1.71l-3-1.8a2 2 0 0 0-2.06 0l-3 1.8Z" />
    <path d="M12 8 7.26 5.15" />
    <path d="m12 8 4.74-2.85" />
    <path d="M12 13.5V8" />
  </svg>
);

const FOLD_ALL_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="6" y="6" width="12" height="12" rx="2" />
    <polyline points="2 2 6 6 2 6" />
    <polyline points="22 2 18 6 22 6" />
    <polyline points="2 22 6 18 2 18" />
    <polyline points="22 22 18 18 22 18" />
  </svg>
);

const EXPAND_ALL_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="9" y="9" width="6" height="6" rx="1" />
    <polyline points="3 3 7 7 3 7" />
    <polyline points="21 3 17 7 21 7" />
    <polyline points="3 21 7 17 3 17" />
    <polyline points="21 21 17 17 21 17" />
  </svg>
);

const SUN_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <circle cx="12" cy="12" r="4" />
    <line x1="12" y1="2" x2="12" y2="4" />
    <line x1="12" y1="20" x2="12" y2="22" />
    <line x1="4.93" y1="4.93" x2="6.34" y2="6.34" />
    <line x1="17.66" y1="17.66" x2="19.07" y2="19.07" />
    <line x1="2" y1="12" x2="4" y2="12" />
    <line x1="20" y1="12" x2="22" y2="12" />
    <line x1="4.93" y1="19.07" x2="6.34" y2="17.66" />
    <line x1="17.66" y1="6.34" x2="19.07" y2="4.93" />
  </svg>
);

const MOON_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
  </svg>
);

/** `auto` mode — a monitor glyph reading as "follow the system". */
const MONITOR_ICON = (
  <svg
    viewBox="0 0 24 24"
    width="14"
    height="14"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect x="2" y="3" width="20" height="14" rx="2" />
    <line x1="8" y1="21" x2="16" y2="21" />
    <line x1="12" y1="17" x2="12" y2="21" />
  </svg>
);

// ─── Theme-mode toggle: pure cycle + presentation helpers ───────────────────
// Exported so the cycle order and per-state labels/icons are unit-testable
// without rendering. Order: auto → light → dark → auto.

const THEME_MODE_CYCLE: readonly GraphThemeMode[] = [
  GRAPH_THEME_MODE.AUTO,
  GRAPH_THEME_MODE.LIGHT,
  GRAPH_THEME_MODE.DARK,
];

/** Next mode in the auto → light → dark → auto cycle. */
export function nextThemeMode(current: GraphThemeMode): GraphThemeMode {
  const idx = THEME_MODE_CYCLE.indexOf(current);
  return THEME_MODE_CYCLE[(idx + 1) % THEME_MODE_CYCLE.length];
}

/** The icon shown for the current mode (represents the state, not the next action). */
export function themeModeIcon(mode: GraphThemeMode): React.ReactElement {
  if (mode === GRAPH_THEME_MODE.LIGHT) return SUN_ICON;
  if (mode === GRAPH_THEME_MODE.DARK) return MOON_ICON;
  return MONITOR_ICON;
}

/** Accessible label naming the current mode and the one a click switches to. */
export function themeModeLabel(mode: GraphThemeMode): string {
  const names: Record<GraphThemeMode, string> = {
    [GRAPH_THEME_MODE.AUTO]: "auto (follows system)",
    [GRAPH_THEME_MODE.LIGHT]: "light",
    [GRAPH_THEME_MODE.DARK]: "dark",
  };
  const next = nextThemeMode(mode);
  const nextName = next === GRAPH_THEME_MODE.AUTO ? "auto" : next;
  return `Theme: ${names[mode]} — switch to ${nextName}`;
}

export function GraphToolbar({
  direction,
  onDirectionChange,
  showControllers,
  onShowControllersChange,
  onZoomIn,
  onZoomOut,
  onFitView,
  onFoldAll,
  onExpandAll,
  foldAllDisabled = false,
  expandAllDisabled = false,
  themeMode,
  onThemeModeChange,
  rightOffset = 0,
}: GraphToolbarProps) {
  const themeToggleEnabled = themeMode !== undefined && onThemeModeChange !== undefined;
  const isVertical = direction === GRAPH_DIRECTION.TB || direction === GRAPH_DIRECTION.BT;
  const directionLabel = isVertical ? "Switch to horizontal layout" : "Switch to vertical layout";
  const controllersLabel = showControllers
    ? "Hide pipe controllers"
    : "Show pipe controllers — groups pipes by their controlling pipe";

  const foldAllSection = onFoldAll || onExpandAll;
  const foldAllTitle = foldAllDisabled
    ? "Fold all controllers (nothing to fold)"
    : "Fold all controllers";
  const expandAllTitle = expandAllDisabled
    ? "Expand all controllers (nothing to expand)"
    : "Expand all controllers";

  return (
    <div className="graph-toolbar" style={{ right: `${rightOffset + 8}px` }}>
      {onFoldAll && (
        <button
          type="button"
          className="graph-toolbar-btn"
          onClick={onFoldAll}
          disabled={foldAllDisabled}
          title={foldAllTitle}
          aria-label={foldAllTitle}
        >
          {FOLD_ALL_ICON}
        </button>
      )}

      {onExpandAll && (
        <button
          type="button"
          className="graph-toolbar-btn"
          onClick={onExpandAll}
          disabled={expandAllDisabled}
          title={expandAllTitle}
          aria-label={expandAllTitle}
        >
          {EXPAND_ALL_ICON}
        </button>
      )}

      {foldAllSection && <div className="graph-toolbar-separator" />}

      <button
        type="button"
        className={`graph-toolbar-btn${showControllers ? " graph-toolbar-btn--active" : ""}`}
        onClick={() => onShowControllersChange(!showControllers)}
        title={controllersLabel}
        aria-label={controllersLabel}
      >
        {BOXES_ICON}
      </button>

      <button
        type="button"
        className="graph-toolbar-btn"
        onClick={() => onDirectionChange(isVertical ? GRAPH_DIRECTION.LR : GRAPH_DIRECTION.TB)}
        title={directionLabel}
        aria-label={directionLabel}
      >
        {isVertical ? ARROW_RIGHT_ICON : ARROW_DOWN_ICON}
      </button>

      {(onZoomOut || onZoomIn || onFitView) && <div className="graph-toolbar-separator" />}

      {onZoomOut && (
        <button
          type="button"
          className="graph-toolbar-btn"
          onClick={onZoomOut}
          title="Zoom out"
          aria-label="Zoom out"
        >
          {MINUS_ICON}
        </button>
      )}

      {onZoomIn && (
        <button
          type="button"
          className="graph-toolbar-btn"
          onClick={onZoomIn}
          title="Zoom in"
          aria-label="Zoom in"
        >
          {PLUS_ICON}
        </button>
      )}

      {onFitView && (
        <button
          type="button"
          className="graph-toolbar-btn"
          onClick={onFitView}
          title="Fit view"
          aria-label="Fit view"
        >
          {FIT_VIEW_ICON}
        </button>
      )}

      {themeToggleEnabled && (
        <>
          <div className="graph-toolbar-separator" />
          <button
            type="button"
            className="graph-toolbar-btn"
            onClick={() => onThemeModeChange(nextThemeMode(themeMode))}
            title={themeModeLabel(themeMode)}
            aria-label={themeModeLabel(themeMode)}
          >
            {themeModeIcon(themeMode)}
          </button>
        </>
      )}
    </div>
  );
}
