import { describe, it, expect } from "vitest";
import { highlightMthds, getAvailableThemes } from "../highlighter";

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

  it("highlights comments in green", async () => {
    const html = await highlightMthds("# comment");
    expect(html).toMatch(/color:#6a9955/i);
  });

  it("highlights concept sections in teal", async () => {
    const html = await highlightMthds("[concept.Scorecard]");
    expect(html).toMatch(/color:#4ECDC4/i);
  });

  it("highlights strings in salmon", async () => {
    const html = await highlightMthds('description = "text"');
    expect(html).toMatch(/color:#ce9178/i);
  });

  it("handles empty string input", async () => {
    const html = await highlightMthds("");
    expect(html).toContain("<pre");
    expect(html).toContain("<code>");
  });

  it("highlights with dark-plus theme and produces valid HTML", async () => {
    const html = await highlightMthds("[pipe.my_pipe]", "dark-plus");
    expect(html).toContain("<pre");
    expect(html).toMatch(/class="[^"]*shiki[^"]*dark-plus[^"]*"/);
    expect(html).toContain("<code>");
  });

  it("highlights with monokai theme and produces valid HTML", async () => {
    const html = await highlightMthds("[concept.MyType]", "monokai");
    expect(html).toContain("<pre");
    expect(html).toMatch(/class="[^"]*shiki[^"]*monokai[^"]*"/);
    expect(html).toContain("<code>");
  });
});

describe("getAvailableThemes", () => {
  it("returns all themes without requiring initialization", () => {
    const themes = getAvailableThemes();
    expect(themes).toEqual(["pipelex-dark", "dark-plus", "monokai", "dracula", "one-dark-pro"]);
  });

  it("returns a new array on each call", () => {
    const a = getAvailableThemes();
    const b = getAvailableThemes();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});
