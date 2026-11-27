import * as React from "react";
import type { StyleMenuEntry } from "@graph/react/viewer/StyleMenu";
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

/** Accessible label of one style's button: the style's name, and what choosing it draws. */
export function timelineStyleMenuLabel(style: TimelineStyleId): string {
  return `${TIMELINE_STYLES[style].name}: ${TIMELINE_STYLES[style].description}`;
}

export interface TimelineStyleMenuProps {
  value: TimelineStyleId;
  /** The styles offered, in order: two at least. */
  options: readonly TimelineStyleId[];
  onChange: (style: TimelineStyleId) => void;
  /** The element the switch sits in, for `RunTimeline` to focus the chosen button again after a choice redraws it. */
  slotRef?: React.Ref<HTMLDivElement>;
}

/**
 * The style switch at the end of the timeline's header: one icon button per
 * style, side by side in a small segmented group, the current one pressed.
 * Each button names its style and says what it draws, as its accessible name
 * and its tooltip. Choosing the pressed one again does nothing.
 */
export function TimelineStyleMenu({ value, options, onChange, slotRef }: TimelineStyleMenuProps) {
  return (
    <div
      className="mthds-run-timeline-header-end mthds-run-timeline-style-switch"
      role="group"
      aria-label="Timeline style"
      ref={slotRef}
    >
      {options.map((style) => {
        const entry = TIMELINE_STYLE_MENU_ENTRIES[style];
        const pressed = style === value;
        return (
          <button
            key={style}
            type="button"
            className="mthds-run-timeline-style-btn"
            aria-pressed={pressed}
            aria-label={timelineStyleMenuLabel(style)}
            title={`${entry.name} — ${entry.description}`}
            onClick={() => {
              if (!pressed) onChange(style);
            }}
          >
            {entry.icon}
          </button>
        );
      })}
    </div>
  );
}
