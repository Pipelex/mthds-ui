"use client";

/**
 * What the reader chose in a timeline, by key, for one stream of progress: a
 * snapshot of another stream starts afresh. `RunTimeline` holds one record per
 * style of what the reader opened or closed, and one of the pages the reader
 * turned the detailed style's batches to, all above the switch between styles,
 * so changing style and back keeps every choice.
 */
import * as React from "react";

const EMPTY_RECORD: Readonly<Record<string, never>> = Object.freeze({});

/** Nothing recorded: every line, row or batch takes its default. */
function emptyRecord<V>(): Readonly<Record<string, V>> {
  return EMPTY_RECORD;
}

export interface StreamRecord<V> {
  /** What the reader chose, by key, in the current stream. */
  values: Readonly<Record<string, V>>;
  /** Records a choice; stable within a stream, so a memoized line it is handed to keeps still. */
  set: (key: string, value: V) => void;
}

export function useStreamRecord<V>(stream: string): StreamRecord<V> {
  const [state, setState] = React.useState<{
    stream: string;
    values: Readonly<Record<string, V>>;
  }>({ stream, values: emptyRecord<V>() });
  const set = React.useCallback(
    (key: string, value: V) => {
      setState((previous) => ({
        stream,
        values: {
          ...(previous.stream === stream ? previous.values : emptyRecord<V>()),
          [key]: value,
        },
      }));
    },
    [stream],
  );
  return { values: state.stream === stream ? state.values : emptyRecord<V>(), set };
}
