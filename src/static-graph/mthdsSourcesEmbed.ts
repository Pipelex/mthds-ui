// ─── The `mthds-sources` embed ───────────────────────────────────────────────
// A page carries a method's `.mthds` files as JSON in
// `<script type="application/json" id="mthds-sources">`, and the standalone
// viewer bundle draws the method from them. Both halves of that contract live
// here, the check the bundle runs on what it reads and the serializer a host
// writes the element with, so the writer and the reader cannot drift apart.
// The contract itself is in `docs/static-graph.md`.

import type { MthdsSource } from "./sourceOrder";

/** The id of the `<script type="application/json">` element carrying the files. */
export const MTHDS_SOURCES_EMBED_ID = "mthds-sources";

function describeEntry(index: number): string {
  return `<script id="${MTHDS_SOURCES_EMBED_ID}"> entry ${index}`;
}

/**
 * Check a parsed `mthds-sources` value against the embed contract: a non-empty
 * array of `{ "name": string, "content": string }`, names non-empty and
 * distinct. Returns the entries with only those two keys. Throws with the
 * offending entry named, so a page written wrong says so on the error screen
 * instead of drawing a partial method.
 */
export function parseMthdsSourcesEmbed(raw: unknown): MthdsSource[] {
  if (!Array.isArray(raw)) {
    throw new Error(
      `<script id="${MTHDS_SOURCES_EMBED_ID}"> must hold a JSON array of ` +
        `{ "name", "content" } objects, one per .mthds file.`,
    );
  }
  if (raw.length === 0) {
    throw new Error(`<script id="${MTHDS_SOURCES_EMBED_ID}"> lists no .mthds file.`);
  }
  const seen = new Set<string>();
  return raw.map((entry: unknown, index) => {
    if (entry === null || typeof entry !== "object" || Array.isArray(entry)) {
      throw new Error(`${describeEntry(index)} is not a { "name", "content" } object.`);
    }
    const { name, content } = entry as Record<string, unknown>;
    if (typeof name !== "string" || name.trim() === "") {
      throw new Error(`${describeEntry(index)} has no "name" string.`);
    }
    if (typeof content !== "string") {
      throw new Error(`${describeEntry(index)} ("${name}") has no "content" string.`);
    }
    if (seen.has(name)) {
      throw new Error(`${describeEntry(index)} repeats the name "${name}".`);
    }
    seen.add(name);
    return { name, content };
  });
}

/**
 * The text a host places inside `<script type="application/json"
 * id="mthds-sources">`: the files as a JSON array of `{ name, content }`,
 * checked against the embed contract, with every `<` written as `\u003c`.
 *
 * The escape is what makes the text safe inside the element. `JSON.parse`
 * reads it back as `<`, while the HTML parser never meets one, so no method
 * text can end the element early, whichever spelling of `</script` it uses, or
 * switch the element into the states a `<!--` opens. A prompt quoting a line of
 * HTML is enough to need it. Neither `JSON.stringify` nor any platform API has
 * an HTML-safe mode, which is why this function exists.
 *
 * Only `name` and `content` are written, whatever else a host's objects carry,
 * and the files keep the order given, because the bundle puts them in merge
 * order itself. Throws on a list the bundle would refuse, naming the entry at
 * fault.
 */
export function serializeMthdsSourcesEmbed(sources: readonly MthdsSource[]): string {
  return JSON.stringify(parseMthdsSourcesEmbed(sources)).replace(/</g, "\\u003c");
}
