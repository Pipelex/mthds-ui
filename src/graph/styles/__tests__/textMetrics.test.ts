import { describe, it, expect } from "vitest";
import { estimateWrap, textWidthPx } from "../textMetrics";

describe("textWidthPx", () => {
  it("adds glyph widths at the font size", () => {
    expect(textWidthPx("", 15)).toBe(0);
    expect(textWidthPx("i", 100)).toBeCloseTo(28);
    expect(textWidthPx("m", 100)).toBeCloseTo(89);
    expect(textWidthPx("mi", 10)).toBeCloseTo(11.7);
  });

  it("measures an unlisted glyph at the wide end of its case", () => {
    expect(textWidthPx("é", 100)).toBeCloseTo(62);
    expect(textWidthPx("É", 100)).toBeCloseTo(78);
  });
});

describe("estimateWrap", () => {
  const font = 10;

  it("counts no line for empty text", () => {
    expect(estimateWrap("   ", 100, font, 3)).toEqual({ lines: 0, drawnLines: 0, clamped: false });
  });

  it("keeps words on a line while they fit, spaces included", () => {
    // "aaa" is 16.8px at 10px; with a space, "aaa aaa" is 36.4px.
    expect(estimateWrap("aaa aaa", 37, font, 3).lines).toBe(1);
    expect(estimateWrap("aaa aaa", 36, font, 3).lines).toBe(2);
  });

  it("breaks a word wider than a line across lines of its own", () => {
    // Ten "m" are 89px: three lines of 30px hold three each, the last one.
    const wrap = estimateWrap("a mmmmmmmmmm", 30, font, 9);
    expect(wrap.lines).toBe(1 + 4);
  });

  it("clamps the drawn lines and says the text is cut", () => {
    const wrap = estimateWrap("one two three four five six", 20, font, 3);
    expect(wrap.lines).toBeGreaterThan(3);
    expect(wrap.drawnLines).toBe(3);
    expect(wrap.clamped).toBe(true);
  });
});
