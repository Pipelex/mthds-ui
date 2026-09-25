/**
 * What would stop the standalone bundle from being inlined into
 * `graph-standalone.html` as it stands. A `<script>` or `<style>` element's
 * text is not parsed as HTML, but the HTML tokenizer still reads it for the
 * sequences that end the element, and a script or stylesheet containing one
 * breaks the page silently: the rest of the code is parsed as HTML.
 *
 * These are checks rather than rewrites. esbuild already writes every
 * `</script` in the code it outputs as `<\/script`, whatever the case and
 * whatever follows, so a text replace would be redundant where it is right and
 * would change the program wherever it is wrong. A check proves the output is
 * safe and turns a future unsafe output into a build error.
 *
 * Kept apart from `build-standalone.mjs` so a test can import it without
 * running the build.
 */

/**
 * Why `js` cannot sit inside an inline `<script>` element, or `null` when it can.
 *
 * Two hazards, both from the HTML tokenizer's script-data states:
 *
 * - `</script` followed by anything ends the element, in any case. The end tag
 *   also closes on `</script ` and `</script/`, which a replace matching
 *   `</script>` alone misses.
 * - A `<!--` that is still open when a `<script` (followed by a space, `/` or
 *   `>`) appears switches the tokenizer into its double-escaped state, where
 *   the element's real end tag no longer ends it and the page swallows
 *   everything after it. esbuild does not escape either sequence. A `<!--`
 *   closed by `-->` before any `<script` is harmless, and so is a `<script`
 *   outside such a section.
 *
 * A `<!-->` is treated as open until the next `-->`, which can only report a
 * hazard that is not there, never miss one.
 *
 * @param {string} js
 * @returns {string | null}
 */
export function findInlineScriptHazard(js) {
  const endTag = /<\/script/i.exec(js);
  if (endTag) {
    return `\`${endTag[0]}\` at offset ${endTag.index} would end the <script> element early`;
  }
  for (const section of js.matchAll(/<!--([\s\S]*?)(?:-->|$)/g)) {
    const opener = /<script[\s/>]/i.exec(section[1]);
    if (opener) {
      const offset = section.index + "<!--".length + opener.index;
      return (
        `\`<script\` at offset ${offset} sits inside a \`<!--\` opened at offset ` +
        `${section.index}, so the <script> element's real end tag would not end it`
      );
    }
  }
  return null;
}

/**
 * Why `css` cannot sit inside an inline `<style>` element, or `null` when it
 * can. The element's text is raw: only `</style`, in any case and followed by
 * anything, ends it, and `<!--` means nothing there.
 *
 * @param {string} css
 * @returns {string | null}
 */
export function findInlineStyleHazard(css) {
  const endTag = /<\/style/i.exec(css);
  if (endTag) {
    return `\`${endTag[0]}\` at offset ${endTag.index} would end the <style> element early`;
  }
  return null;
}
