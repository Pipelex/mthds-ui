"use client";

/**
 * What the reader opened or closed in a timeline, by key, for one stream of
 * progress: a snapshot of another stream starts afresh. `RunTimeline` holds one
 * per style, above the switch between them, so changing style and back keeps
 * what the reader opened.
 */
import * as React from "react";

/** Nothing opened or closed: every line or row takes its default. */
export const EMPTY_EXPANSION: Readonly<Record<string, boolean>> = Object.freeze({});

export interface StreamExpansion {
  /** What the reader opened (`true`) or closed (`false`), by key, in the current stream. */
  expanded: Readonly<Record<string, boolean>>;
  /** Records a choice; stable within a stream, so a memoized line it is handed to keeps still. */
  toggle: (key: string, expanded: boolean) => void;
}

export function useStreamExpansion(stream: string): StreamExpansion {
  const [state, setState] = React.useState<{
    stream: string;
    expanded: Readonly<Record<string, boolean>>;
  }>({ stream, expanded: EMPTY_EXPANSION });
  const toggle = React.useCallback(
    (key: string, expanded: boolean) => {
      setState((previous) => ({
        stream,
        expanded: {
          ...(previous.stream === stream ? previous.expanded : EMPTY_EXPANSION),
          [key]: expanded,
        },
      }));
    },
    [stream],
  );
  return { expanded: state.stream === stream ? state.expanded : EMPTY_EXPANSION, toggle };
}
