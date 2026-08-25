/**
 * The Run button's label has to clear WCAG AA in both themes.
 *
 * This is pinned as a test rather than left to a comment because the failure is
 * silent: the button keeps rendering, nothing throws, and the only symptom is
 * that some people cannot read the primary call to action. The colours are
 * literals precisely so they cannot drift with the palette, and a literal that
 * nothing checks is a literal someone will "tidy up" back into a `var()`.
 *
 * What is asserted is the ratio, not the hex — so a different accessible blue
 * is free to land here, and only an inaccessible one fails.
 */
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const CSS = readFileSync(new URL("../react/RunPanel.css", import.meta.url), "utf8");

/** AA for text below 18px (or below 14px bold), which the 13px/600 label is. */
const AA_NORMAL_TEXT = 4.5;

/** Relative luminance, per WCAG 2.x. */
function luminance(hex: string): number {
  const channels = [1, 3, 5]
    .map((offset) => parseInt(hex.slice(offset, offset + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)));
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

function contrastRatio(a: string, b: string): number {
  const [lighter, darker] = [luminance(a), luminance(b)].sort((x, y) => y - x);
  return (lighter + 0.05) / (darker + 0.05);
}

/**
 * Pull one declaration out of one rule. Deliberately literal-only: a `var()`
 * here would mean the button went back to reading the graph palette, which is
 * the regression this file exists to catch, so failing to match IS the finding.
 */
function declaration(selector: string, property: string): string {
  const rule = CSS.split(selector)[1]?.split("}")[0];
  const match = rule?.match(new RegExp(`${property}:\\s*(#[0-9a-fA-F]{6})\\s*;`));
  if (!match) {
    throw new Error(`No literal \`${property}\` found in \`${selector}\` — did it become a var()?`);
  }
  return match[1].toLowerCase();
}

describe("Run button contrast", () => {
  const label = declaration(".mthds-run-panel-run {", "color");

  it.each([
    ["light — the panel's default theme", ".mthds-run-panel-run {"],
    ["dark — theme={DARK}", ".mthds-run-panel.dark .mthds-run-panel-run {"],
  ])("clears AA in %s", (_name, selector) => {
    expect(contrastRatio(declaration(selector, "background"), label)).toBeGreaterThanOrEqual(
      AA_NORMAL_TEXT,
    );
  });
});
