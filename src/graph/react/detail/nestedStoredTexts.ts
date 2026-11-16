import * as React from "react";
import { loadStoredValues, type LoadText, type RunField } from "@pipelex/mthds-form";

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

/** A node's value with its stored texts loaded, and how many could not be. */
export interface NestedTextsLoaded {
  /**
   * The value with every stored text that was read put inline. The value it
   * was loaded from, the same object, when none could be read.
   */
  value: unknown;
  /** How many stored texts kept their reference because their read failed. */
  unloaded: number;
}

/**
 * Load the stored texts nested in `value` through `load`. `null` when the value
 * holds none, in which case nothing was read and the caller keeps its value as
 * it is. Never rejects: a read that fails leaves that text's reference in place
 * and is counted in `unloaded`, and a value none of whose texts could be read
 * comes back as the same object.
 */
export async function loadNestedStoredTexts(
  field: RunField,
  value: unknown,
  load: LoadText,
): Promise<NestedTextsLoaded | null> {
  if (value === null || value === undefined) return null;
  let asked = 0;
  let read = 0;
  const counted: LoadText = (url) => {
    asked += 1;
    return load(url).then((text) => {
      read += 1;
      return text;
    });
  };
  try {
    const loaded = await loadStoredValues(field, value, counted);
    if (asked === 0) return null;
    return { value: read === 0 ? value : loaded.value, unloaded: loaded.unloaded };
  } catch {
    return asked === 0 ? null : { value, unloaded: Math.max(asked - read, 1) };
  }
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
 * What the panel shows for node `key`'s `value`, given the last load that
 * settled. The same node's value is shown as that load left it, even while a
 * load of a new value is still running, so a host that re-creates an equal
 * value on every poll never sees the texts flash back to their references.
 * Another node's load is never shown: until this node's own load settles, its
 * value is shown as it came.
 */
export function shownNestedValue(
  settled: SettledNestedTexts | null,
  key: string,
  value: unknown,
): unknown {
  if (!settled || settled.key !== key) return value;
  // The same node: either the value that load read, or a newer one whose own
  // load has not settled yet (every load settles, with or without texts), so
  // the last value read stands until it does.
  return settled.shown;
}

/**
 * A node's value as the panel shows it: at once as the spec holds it, then,
 * once its nested stored texts are read through `load`, with them inline. A
 * value holding no stored text is read with no request and handed back as the
 * same object, and so is one none of whose texts could be read. `key` names
 * the node the value belongs to: while a new value of the same node is being
 * read, the last one read is still shown (`shownNestedValue`), and a load
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
): unknown {
  const [settled, setSettled] = React.useState<SettledNestedTexts | null>(null);
  const loadRef = React.useRef(load);
  loadRef.current = load;
  const canLoad = load !== undefined;

  React.useEffect(() => {
    if (!canLoad || !field || value === null || value === undefined) return;
    let live = true;
    const latest: LoadText = (url) => {
      const current = loadRef.current;
      return current ? current(url) : Promise.reject(new Error("No loader."));
    };
    void loadNestedStoredTexts(field, value, latest).then((loaded) => {
      if (live) setSettled({ key, value, shown: loaded ? loaded.value : value });
    });
    return () => {
      live = false;
    };
  }, [field, key, value, canLoad]);

  if (!canLoad || !field || value === null || value === undefined) return value;
  return shownNestedValue(settled, key, value);
}
