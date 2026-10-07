// How wide text renders before the DOM exists: what the layout sizes the
// simple style's boxes and arrow labels from. Pure and deterministic.
//
// The widths are per glyph, as a fraction of the font size, measured in
// Chromium for the stack `--font-sans` names (Inter, then the system sans of
// each platform, then the generic one) and kept at the widest of them, at the
// heaviest weight the style draws text in. An estimate that errs wide costs a
// box a little spare room; one that errs narrow cuts a title's last line.

const GLYPH_EM_GROUPS: readonly (readonly [number, string])[] = [
  [0.28, "il .,'"],
  [0.33, "fjt:;!()"],
  [0.35, "/"],
  [0.39, "I"],
  [0.44, "r-"],
  [0.51, "1z"],
  [0.56, '7aceksvxyJ"'],
  [0.59, "25"],
  [0.6, "8"],
  [0.61, "369bdghnopquF?"],
  [0.64, "04"],
  [0.67, "ELPSTZ"],
  [0.72, "ABCDNRUVXY"],
  [0.78, "GHKOQ"],
  [0.8, "w"],
  [0.83, "&"],
  [0.89, "m"],
  [0.94, "M"],
  [1, "W%"],
];

const GLYPH_EM: ReadonlyMap<string, number> = new Map(
  GLYPH_EM_GROUPS.flatMap(([em, glyphs]) => [...glyphs].map((glyph) => [glyph, em] as const)),
);

/** A glyph outside the table (an accented letter, a symbol): as wide as the wide end of its case. */
const UNLISTED_LOWER_EM = 0.62;
const UNLISTED_UPPER_EM = 0.78;

function glyphEm(glyph: string): number {
  const listed = GLYPH_EM.get(glyph);
  if (listed !== undefined) return listed;
  return glyph !== glyph.toLowerCase() ? UNLISTED_UPPER_EM : UNLISTED_LOWER_EM;
}

/** A text's rendered width at a font size, in pixels. */
export function textWidthPx(text: string, fontPx: number): number {
  let em = 0;
  for (const glyph of text) em += glyphEm(glyph);
  return em * fontPx;
}

/** How many lines a text wraps to at a width, and whether it fits in `maxLines`. */
export interface WrapEstimate {
  /** Lines the text needs, unclamped. */
  lines: number;
  /** Lines it is drawn on: `lines` clamped to `maxLines`. */
  drawnLines: number;
  /** Whether the text is cut, so its box must carry the full text in a tooltip. */
  clamped: boolean;
}

/**
 * Estimate a text's wrapped line count by greedy word wrap at a line width,
 * the way the browser wraps it. A word wider than a line is broken across as
 * many lines as it needs (`overflow-wrap: anywhere`), starting on a line of
 * its own.
 */
export function estimateWrap(
  text: string,
  lineWidthPx: number,
  fontPx: number,
  maxLines: number,
): WrapEstimate {
  const words = text.split(/\s+/).filter((w) => w.length > 0);
  const spacePx = textWidthPx(" ", fontPx);
  let lines = words.length === 0 ? 0 : 1;
  let used = 0;
  for (const word of words) {
    const wordPx = textWidthPx(word, fontPx);
    if (wordPx > lineWidthPx) {
      if (used > 0) lines += 1;
      used = 0;
      for (const glyph of word) {
        const glyphPx = textWidthPx(glyph, fontPx);
        if (used > 0 && used + glyphPx > lineWidthPx) {
          lines += 1;
          used = 0;
        }
        used += glyphPx;
      }
      continue;
    }
    const needed = used === 0 ? wordPx : used + spacePx + wordPx;
    if (needed <= lineWidthPx) {
      used = needed;
    } else {
      lines += 1;
      used = wordPx;
    }
  }
  const drawnLines = Math.min(lines, maxLines);
  return { lines, drawnLines, clamped: lines > maxLines };
}
