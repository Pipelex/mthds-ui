// ─── The timeline style registry ────────────────────────────────────────────
// A closed, typed table, as the graph's styles are: adding a style is a new
// `TIMELINE_STYLE` id, after which the compiler names every table keyed by
// `TimelineStyleId` that needs a row — the descriptor below and the view that
// draws it in the React layer.

/** How a run's progress is drawn. */
export const TIMELINE_STYLE = {
  /** Every invocation, labelled by its pipe code, with a bar on a shared time axis. */
  DETAILED: "detailed",
  /** The steps in the method's own words, as a checklist, with each batch as one line of counts. */
  SIMPLE: "simple",
} as const;

export type TimelineStyleId = (typeof TIMELINE_STYLE)[keyof typeof TIMELINE_STYLE];

/** What the registry says of one style: what it is called and what it shows, for a menu. */
export interface TimelineStyleDescriptor {
  id: TimelineStyleId;
  /** The style's name in the menu. */
  name: string;
  /** One line saying what the style shows, under its name in the menu. */
  description: string;
}

export const TIMELINE_STYLES: Record<TimelineStyleId, TimelineStyleDescriptor> = {
  [TIMELINE_STYLE.DETAILED]: {
    id: TIMELINE_STYLE.DETAILED,
    name: "Detailed",
    description: "Every pipe, with a bar on a time axis",
  },
  [TIMELINE_STYLE.SIMPLE]: {
    id: TIMELINE_STYLE.SIMPLE,
    name: "Simple",
    description: "The steps in plain words, with batches as counts",
  },
};

/** Every registered style, in the order a menu lists them: `TIMELINE_STYLE`'s, so none is left out. */
export const TIMELINE_STYLE_IDS: readonly TimelineStyleId[] = Object.values(TIMELINE_STYLE);

/** The style a timeline draws when the host names none. */
export const DEFAULT_TIMELINE_STYLE: TimelineStyleId = TIMELINE_STYLE.DETAILED;

/**
 * Whether a value names a registered style. For values that cross an untyped
 * boundary, such as a saved setting or a host written in plain JavaScript,
 * before they reach the timeline.
 */
export function isTimelineStyleId(value: unknown): value is TimelineStyleId {
  return typeof value === "string" && Object.hasOwn(TIMELINE_STYLES, value);
}

/**
 * The style a timeline draws for its `timelineStyle` prop: the style it names,
 * or the default when it is unset. A value naming no registered style is read
 * as unset rather than thrown on, as `resolveGraphStyle` reads one: a style is
 * a preference, and a host relaying a setting written for a newer version of
 * this package should still get a timeline.
 */
export function resolveTimelineStyle(style: unknown): TimelineStyleId {
  return isTimelineStyleId(style) ? style : DEFAULT_TIMELINE_STYLE;
}

/**
 * The styles a timeline's menu offers, from its `styleMenu` prop: nothing for
 * `false` or `undefined` (the menu is opt-in), every registered style in
 * registry order for `true`, and for a list the registered styles it names, in
 * its order and without repeats. A menu needs two styles to choose between, so
 * fewer than two offer none.
 */
export function resolveTimelineStyleMenu(
  styleMenu: boolean | readonly TimelineStyleId[] | undefined,
): TimelineStyleId[] {
  if (styleMenu === undefined || styleMenu === false) return [];
  const requested: readonly unknown[] = styleMenu === true ? TIMELINE_STYLE_IDS : styleMenu;
  const offered: TimelineStyleId[] = [];
  for (const id of requested) {
    if (isTimelineStyleId(id) && !offered.includes(id)) offered.push(id);
  }
  return offered.length >= 2 ? offered : [];
}
