import { describe, it, expect } from "vitest";
import { highlightMthds, getAvailableThemes, getMthdsTheme, getMthdsThemes } from "../highlighter";
import { pipelexDarkTheme } from "../pipelexDarkTheme";
import { pipelexLightTheme } from "../pipelexLightTheme";

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

  // The io-ref grammar carries a presence marker after the multiplicity suffix
  // (`Text?` optional, `Text!` force). The concept name must still tokenize as a
  // concept when one is present — without the marker in the grammar the whole
  // match fails and the ref falls through to plain-string tokenization.
  const CONCEPT_TEAL = /color:#4ECDC4/i;

  it.each(['output = "Text"', 'output = "Text[]"', 'output = "Text?"', 'output = "Text[]!"'])(
    "tokenizes the concept in %s",
    async (line) => {
      expect(await highlightMthds(line)).toMatch(CONCEPT_TEAL);
    },
  );

  it.each([
    'style_hint = "Text"',
    'style_hint = "Text?"',
    'style_hint = "recruitment.CandidateProfile[]?"',
    'style_hint = "Page[3]!"',
  ])("tokenizes the concept in an io entry %s", async (line) => {
    expect(await highlightMthds(line)).toMatch(CONCEPT_TEAL);
  });

  it("handles empty string input", async () => {
    const html = await highlightMthds("");
    expect(html).toContain("<pre");
    expect(html).toContain("<code>");
  });

  it("highlights with pipelex-light theme and produces valid HTML", async () => {
    const html = await highlightMthds("[pipe.my_pipe]", "pipelex-light");
    expect(html).toContain("<pre");
    expect(html).toMatch(/class="[^"]*shiki[^"]*pipelex-light[^"]*"/);
    expect(html).toContain("<code>");
  });

  it("uses the light brand palette for pipe sections in pipelex-light", async () => {
    const html = await highlightMthds("[pipe.my_pipe]", "pipelex-light");
    expect(html).toMatch(/color:#D32F2F/i);
  });

  it("uses the app's warm cream background in pipelex-light", async () => {
    const html = await highlightMthds("x = 1", "pipelex-light");
    expect(html).toMatch(/background-color:#F6F3EF/i);
  });
});

describe("getAvailableThemes", () => {
  it("returns only the pipelex themes", () => {
    const themes = getAvailableThemes();
    expect(themes).toEqual(["pipelex-dark", "pipelex-light"]);
  });

  it("returns a new array on each call", () => {
    const a = getAvailableThemes();
    const b = getAvailableThemes();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

describe("getMthdsTheme / getMthdsThemes", () => {
  it("defaults to pipelex-dark", () => {
    expect(getMthdsTheme().name).toBe("pipelex-dark");
  });

  it("returns the light theme by name", () => {
    expect(getMthdsTheme("pipelex-light").name).toBe("pipelex-light");
  });

  it("returns both themes for editor registration", () => {
    expect(getMthdsThemes().map((t) => t.name)).toEqual(["pipelex-dark", "pipelex-light"]);
  });

  it("light theme mirrors every dark theme scope", () => {
    const scopesOf = (theme: typeof pipelexDarkTheme) =>
      (theme.settings ?? []).flatMap((s) => s.scope ?? []).sort();
    expect(scopesOf(pipelexLightTheme)).toEqual(scopesOf(pipelexDarkTheme));
  });
});
