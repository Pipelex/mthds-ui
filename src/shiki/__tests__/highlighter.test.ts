import { describe, it, expect } from "vitest";
import { highlightMthds } from "../highlighter";

describe("highlightMthds", () => {
  it("returns HTML with Shiki wrapper structure", async () => {
    const html = await highlightMthds('[pipe.screen_candidates]\ntype = "GenericPipe"');
    expect(html).toContain("<pre");
    expect(html).toMatch(/class="[^"]*shiki[^"]*pipelex-dark[^"]*"/);
    expect(html).toContain("<code>");
  });

  it("highlights pipe sections in coral red", async () => {
    const html = await highlightMthds("[pipe.screen_candidates]");
    expect(html).toMatch(/color:#FF6B6B/i);
  });

  it("highlights comments in muted blue", async () => {
    const html = await highlightMthds("# comment");
    expect(html).toMatch(/color:#6272A4/i);
  });

  it("highlights concept sections in teal", async () => {
    const html = await highlightMthds("[concept.Scorecard]");
    expect(html).toMatch(/color:#4ECDC4/i);
  });

  it("highlights strings in yellow", async () => {
    const html = await highlightMthds('description = "text"');
    expect(html).toMatch(/color:#F1FA8C/i);
  });

  it("handles empty string input", async () => {
    const html = await highlightMthds("");
    expect(html).toContain("<pre");
    expect(html).toContain("<code>");
  });
});
