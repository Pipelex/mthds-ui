import * as React from "react";
import { StyleMenu, type StyleMenuEntry } from "@graph/react/viewer/StyleMenu";
import {
  TIMELINE_STYLE,
  TIMELINE_STYLES,
  type TimelineStyleId,
} from "@timeline/styles/timelineStyles";

const ICON_PROPS = {
  viewBox: "0 0 24 24",
  width: 14,
  height: 14,
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/**
 * The timeline's styles as the style menu shows them: the registry's name and
 * description with an icon each. Keyed by `TimelineStyleId`, so a new style
 * does not compile without one.
 */
export const TIMELINE_STYLE_MENU_ENTRIES: Record<TimelineStyleId, StyleMenuEntry> = {
  // Bars of different lengths on a shared axis.
  [TIMELINE_STYLE.DETAILED]: {
    ...TIMELINE_STYLES[TIMELINE_STYLE.DETAILED],
    icon: (
      <svg {...ICON_PROPS}>
        <line x1="3" y1="3" x2="3" y2="21" />
        <line x1="7" y1="6" x2="15" y2="6" />
        <line x1="10" y1="12" x2="20" y2="12" />
        <line x1="7" y1="18" x2="13" y2="18" />
      </svg>
    ),
  },
  // A checklist: a check, then lines of words.
  [TIMELINE_STYLE.SIMPLE]: {
    ...TIMELINE_STYLES[TIMELINE_STYLE.SIMPLE],
    icon: (
      <svg {...ICON_PROPS}>
        <polyline points="3 6 5 8 8 4" />
        <line x1="12" y1="6" x2="21" y2="6" />
        <circle cx="5.5" cy="12" r="2" />
        <line x1="12" y1="12" x2="21" y2="12" />
        <circle cx="5.5" cy="18" r="2" />
        <line x1="12" y1="18" x2="21" y2="18" />
      </svg>
    ),
  },
};

/** Accessible label of the menu button: the current style, and what the button does. */
export function timelineStyleMenuLabel(style: TimelineStyleId): string {
  return `Timeline style: ${TIMELINE_STYLES[style].name} — choose how the run is drawn`;
}

export interface TimelineStyleMenuProps {
  value: TimelineStyleId;
  /** The styles offered, in order: two at least. */
  options: readonly TimelineStyleId[];
  onChange: (style: TimelineStyleId) => void;
}

/** The style menu at the end of the timeline's header: the graph viewer's menu, over the timeline's styles. */
export function TimelineStyleMenu({ value, options, onChange }: TimelineStyleMenuProps) {
  return (
    <div className="mthds-run-timeline-header-end">
      <StyleMenu
        value={value}
        options={options}
        onChange={onChange}
        placement="down-end"
        entries={TIMELINE_STYLE_MENU_ENTRIES}
        menuLabel="Timeline style"
        buttonLabel={timelineStyleMenuLabel}
        buttonClassName="mthds-run-timeline-style-btn"
      />
    </div>
  );
}
