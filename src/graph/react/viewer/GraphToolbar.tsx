import React from "react";
import "./GraphToolbar.css";
import type { GraphDirection } from "@graph/types";

export interface GraphToolbarProps {
  direction: GraphDirection;
  onDirectionChange: (direction: GraphDirection) => void;
  showControllers: boolean;
  onShowControllersChange: (showControllers: boolean) => void;
  onZoomIn?: () => void;
  onZoomOut?: () => void;
  onFitView?: () => void;
  /** Pixel offset from the right edge (e.g. detail panel width when open). */
  rightOffset?: number;
}

const ARROW_RIGHT_ICON = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
    <polyline points="12 5 19 12 12 19" />
  </svg>
);

const ARROW_DOWN_ICON = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <polyline points="19 12 12 19 5 12" />
  </svg>
);

const MINUS_ICON = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const PLUS_ICON = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <line x1="12" y1="5" x2="12" y2="19" />
    <line x1="5" y1="12" x2="19" y2="12" />
  </svg>
);

const FIT_VIEW_ICON = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 3 21 3 21 9" />
    <polyline points="9 21 3 21 3 15" />
    <line x1="21" y1="3" x2="14" y2="10" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

const BOXES_ICON = (
  <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
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

export function GraphToolbar({
  direction,
  onDirectionChange,
  showControllers,
  onShowControllersChange,
  onZoomIn,
  onZoomOut,
  onFitView,
  rightOffset = 0,
}: GraphToolbarProps) {
  const directionLabel =
    direction === "TB" ? "Switch to horizontal layout" : "Switch to vertical layout";
  const controllersLabel = showControllers
    ? "Hide pipe controllers"
    : "Show pipe controllers — groups pipes by their controlling pipe";

  return (
    <div
      className="graph-toolbar"
      style={{ right: `${rightOffset + 8}px` }}
    >
      <button
        type="button"
        className="graph-toolbar-btn"
        onClick={() => onDirectionChange(direction === "TB" ? "LR" : "TB")}
        title={directionLabel}
        aria-label={directionLabel}
      >
        {direction === "TB" ? ARROW_RIGHT_ICON : ARROW_DOWN_ICON}
      </button>

      <button
        type="button"
        className={`graph-toolbar-btn${showControllers ? " graph-toolbar-btn--active" : ""}`}
        onClick={() => onShowControllersChange(!showControllers)}
        title={controllersLabel}
        aria-label={controllersLabel}
      >
        {BOXES_ICON}
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
    </div>
  );
}
