import * as React from "react";
import {
  loadStoredValues,
  readStoredReference,
  type LoadText,
  type RunField,
} from "@pipelex/mthds-form";

/**
 * The stored texts nested in a node's value, loaded for the graph's data panel.
 *
 * The kernel's views load a stored `Text`, `Markdown`, `Html` or `JSON` value
 * they draw themselves, through the host's `loadText`, but not one nested in
 * another native's content: a `Page` holds its text under
 * `text_and_images.text`, and the kernel's page view reads it only when it
 * arrived inline, so a stored page reads as absent. The panel therefore loads
 * every stored text in a node's value with the kernel's own walk,
 * `loadStoredValues`, which follows the value's descriptor through structures,
 * lists and natives alike, and draws the loaded value.
 */

/**
 * Whether `value` holds a stored text anywhere the kernel's walk would load
 * one: the value itself when the field is a stored value's node, and the
 * members of a structure and the items of a list beneath it. It follows
 * `loadStoredValues`'s own walk, reading each place with the kernel's
 * `readStoredReference`, and answers at once, so the panel knows from its
 * first render whether a load is coming and never says so for a value that
 * holds none.
 */
export function holdsStoredTexts(field: RunField, value: unknown): boolean {
  if (readStoredReference(field, value)) return true;
  if (field.kind === "list" && Array.isArray(value)) {
    return value.some((item) => holdsStoredTexts(field.item, item));
  }
  if (field.kind === "list" && field.contentKey !== undefined && isRecord(value)) {
    const items = Object.hasOwn(value, field.contentKey) ? value[field.contentKey] : undefined;
    return Array.isArray(items) && holdsStoredTexts(field, items);
  }
  if (field.kind === "object" && isRecord(value)) {
    return field.fields.some(
      (member) => Object.hasOwn(value, member.name) && holdsStoredTexts(member, value[member.name]),
    );
  }
  return false;
}

/**
 * Load the stored texts nested in `value` through `load`, with the kernel's
 * `loadStoredValues`, which never rejects: a read that fails leaves that
 * text's reference in place. Answers the value with every text that was read
 * put inline, or the value it was given, the same object, when nothing was
 * read: it held no stored text, or none could be read.
 */
export async function loadNestedStoredTexts(
  field: RunField,
  value: unknown,
  load: LoadText,
): Promise<unknown> {
  if (value === null || value === undefined) return value;
  let read = false;
  const loaded = await loadStoredValues(field, value, (url) =>
    load(url).then((text) => {
      read = true;
      return text;
    }),
  );
  return read ? loaded.value : value;
}

/**
 * The last load that settled for a node: the node it belongs to, the value it
 * was loaded from, and what that value is shown as.
 */
export interface SettledNestedTexts {
  /** Which node's value was loaded, as the panel names it (`useNestedStoredTexts`). */
  key: string;
  /** The value the load read, as the spec held it. */
  value: unknown;
  /** What it is shown as: the value with its stored texts inline, or the value itself. */
  shown: unknown;
}

/**
 * Whether the last load that settled answers for node `key`'s `value`: the
 * same node, and the value it read or one structurally equal to it, as a host
 * re-polling its run hands over. A value with any other content is not
 * answered for, whatever node it belongs to.
 */
export function settledFor(
  settled: SettledNestedTexts | null,
  key: string,
  value: unknown,
): settled is SettledNestedTexts {
  return (
    settled !== null &&
    settled.key === key &&
    (settled.value === value || sameJsonValue(settled.value, value))
  );
}

/**
 * What the panel shows for node `key`'s `value`, given the last load that
 * settled: what that load left when it answers for this value
 * (`settledFor`), so a host that re-creates an equal value on every poll
 * never sees the texts flash back to their references; the value as it came
 * otherwise, so neither another node's data nor this node's older data is
 * ever drawn while new content is read.
 */
export function shownNestedValue(
  settled: SettledNestedTexts | null,
  key: string,
  value: unknown,
): unknown {
  return settledFor(settled, key, value) ? settled.shown : value;
}

/** What the panel draws for a node's value. */
export interface NestedTextsShown {
  /** The value, with its stored texts inline once they are read. */
  value: unknown;
  /** True while the value holds stored texts whose load has not settled. */
  loading: boolean;
}

/**
 * A node's value as the panel shows it: at once as the spec holds it, then,
 * once its nested stored texts are read through `load`, with them inline. A
 * value holding no stored text is read with no request, never reported as
 * loading, and handed back as the same object; so is one none of whose texts
 * could be read, once its load settles. `key` names the node the value
 * belongs to: a value equal to the one last read for that node keeps showing
 * that load's texts while it is read again (`shownNestedValue`), and a load
 * still running when another node opens is discarded. With no `load`, no
 * `field` or no value, the value stays as it came.
 *
 * Runs only while the panel is drawn, which is only while its node is open, so
 * nothing is read for a node never opened, and reopening a node reads again.
 * `load`'s identity need not be stable: the latest one is called, and a new
 * one does not start another load.
 */
export function useNestedStoredTexts(
  field: RunField | null,
  key: string,
  value: unknown,
  load: LoadText | undefined,
): NestedTextsShown {
  const [settled, setSettled] = React.useState<SettledNestedTexts | null>(null);
  const loadRef = React.useRef(load);
  loadRef.current = load;
  const canLoad = load !== undefined;
  const holds = React.useMemo(
    () => field !== null && value !== null && value !== undefined && holdsStoredTexts(field, value),
    [field, value],
  );
  const loads = canLoad && holds;

  React.useEffect(() => {
    if (!loads || !field) return;
    let live = true;
    const latest: LoadText = (url) => {
      const current = loadRef.current;
      return current ? current(url) : Promise.reject(new Error("No loader."));
    };
    void loadNestedStoredTexts(field, value, latest).then((shown) => {
      if (live) setSettled({ key, value, shown });
    });
    return () => {
      live = false;
    };
  }, [loads, field, key, value]);

  if (!loads) return { value, loading: false };
  return settledFor(settled, key, value)
    ? { value: settled.shown, loading: false }
    : { value, loading: true };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Whether two values a spec holds, plain JSON, have the same content: the same
 * primitives, arrays of equal items in order, and objects with the same keys
 * holding equal values.
 */
function sameJsonValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (Array.isArray(a)) {
    return (
      Array.isArray(b) && a.length === b.length && a.every((item, i) => sameJsonValue(item, b[i]))
    );
  }
  if (!isRecord(a) || !isRecord(b)) return false;
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length &&
    keys.every((name) => Object.hasOwn(b, name) && sameJsonValue(a[name], b[name]))
  );
}
