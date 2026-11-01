/**
 * The checks `scripts/build-standalone.mjs` runs before inlining the bundle
 * into `graph-standalone.html`. The build fails on any hazard they report, so
 * what matters is that they report every sequence the HTML tokenizer acts on
 * inside the element, and nothing esbuild's own output legitimately contains.
 */
import { describe, it, expect } from "vitest";
import { findInlineScriptHazard, findInlineStyleHazard } from "../../../scripts/inlineHazards.mjs";
import { parseMthdsSourcesEmbed } from "@static-graph/mthdsSourcesEmbed";
import { loadStandaloneEmbeds } from "../loadEmbeds";
import { parseJsonScriptText } from "../readJsonScript";

/**
 * The `<!--` the bundle has held since `@pipelex/mthds-form` 0.25.0, as esbuild
 * prints it: the kernel's reader of extracted pages testing a page's text for
 * an HTML comment, with no `-->` anywhere after it. This package's own code is
 * printed after it.
 */
const KERNEL_UNCLOSED_OPENER = 'function ZVe(e,t){if(e.startsWith("<!--",t)){return t}}';

describe("findInlineScriptHazard", () => {
  it("passes esbuild's own escaping of an end tag", () => {
    expect(findInlineScriptHazard('const a="<\\/script>",b=`<\\/SCRIPT >`;')).toBeNull();
  });

  it("passes a `<!--` closed before any `<script`", () => {
    // The shape an HTML sanitizer's comment regex has, followed later by an
    // error message naming an embed element as markup.
    const js =
      "YS=/<!--(?:-?>|[\\s\\S]*?(?:-->|$))/;" +
      'throw new Error(`<script id="${id}"> lists no .mthds file.`);';
    expect(findInlineScriptHazard(js)).toBeNull();
  });

  it("passes the kernel's unclosed `<!--` followed by errors naming a selector, as in today's bundle", () => {
    const js = KERNEL_UNCLOSED_OPENER + "throw new Error(`script#${id} lists no .mthds file.`);";
    expect(findInlineScriptHazard(js)).toBeNull();
  });

  it("reports the kernel's unclosed `<!--` followed by an error naming its element as markup", () => {
    const js =
      KERNEL_UNCLOSED_OPENER + 'throw new Error(`<script id="${id}"> lists no .mthds file.`);';
    expect(findInlineScriptHazard(js)).toMatch(/that no `-->` closes/);
  });

  it("passes a `<script` outside any `<!--` section", () => {
    expect(findInlineScriptHazard('r.innerHTML="<script><\\/script>"')).toBeNull();
  });

  it.each([["</script>"], ["</script >"], ["</SCRIPT/>"], ["</script\n>"]])(
    "reports the end tag %j",
    (endTag) => {
      expect(findInlineScriptHazard(`const a = "${endTag}";`)).toMatch(/would end the <script>/);
    },
  );

  it("passes a `<script` inside a `<!--` that a later `-->` closes", () => {
    // The `-->` returns the tokenizer from the double-escaped state to plain
    // script data, so the real end tag ends the element as usual.
    expect(findInlineScriptHazard('a="<!--";b="<script>";c="-->"')).toBeNull();
  });

  it.each([["<!-->"], ["<!--->"]])("passes a `<script` after %j, which closes itself", (open) => {
    expect(findInlineScriptHazard(`a="${open}";b="<script>"`)).toBeNull();
  });

  it("reports a `<script` after a `<!--` that is never closed", () => {
    expect(findInlineScriptHazard('a="<!--";b=`<script id="x">`')).toMatch(
      /inside a `<!--` opened at offset 3 that no `-->` closes/,
    );
  });

  it("reports the unclosed section after a closed one", () => {
    expect(findInlineScriptHazard('a="<!-- -->";b="<!--";c="<script>"')).toMatch(
      /`<script` at offset 25 sits inside a `<!--` opened at offset 16/,
    );
  });

  it("ignores `<script` not followed by a space, `/` or `>`", () => {
    expect(findInlineScriptHazard('a="<!--";b="<scripts";c="-->"')).toBeNull();
  });
});

describe("findInlineStyleHazard", () => {
  it("passes ordinary CSS, comments included", () => {
    expect(findInlineStyleHazard("/* <!-- */ .a { color: red; }")).toBeNull();
  });

  it.each([["</style>"], ["</STYLE >"], ["</style/"]])("reports the end tag %j", (endTag) => {
    expect(findInlineStyleHazard(`.a::after { content: "${endTag}"; }`)).toMatch(
      /would end the <style>/,
    );
  });
});

/** The message `fn` throws; fails the test when it throws nothing. */
function thrownMessage(fn: () => unknown): string {
  try {
    fn();
  } catch (error) {
    return error instanceof Error ? error.message : String(error);
  }
  throw new Error("expected the call to throw");
}

describe("the standalone loader's own errors", () => {
  // Compiled into the bundle after the kernel's unclosed `<!--`, so a `<script`
  // opener in any of them would fail the build. Each is checked where the
  // bundle puts it.
  it.each([
    ["sources that are not an array", () => parseMthdsSourcesEmbed({})],
    ["an empty list of sources", () => parseMthdsSourcesEmbed([])],
    ["a source that is not an object", () => parseMthdsSourcesEmbed(["bundle.mthds"])],
    ["a source with no name", () => parseMthdsSourcesEmbed([{ content: "" }])],
    ["a source with no content", () => parseMthdsSourcesEmbed([{ name: "bundle.mthds" }])],
    [
      "a repeated source name",
      () =>
        parseMthdsSourcesEmbed([
          { name: "bundle.mthds", content: "" },
          { name: "bundle.mthds", content: "" },
        ]),
    ],
    ["malformed JSON in an embed", () => parseJsonScriptText("{not json", "pipelex-config")],
    [
      "both graph embeds on one page",
      () => loadStandaloneEmbeds({ config: null, graphspec: "{}", mthdsSources: "[]" }),
    ],
  ])("leave the bundle inlinable on %s", (_label, fn) => {
    const message = thrownMessage(fn);
    expect(message).toMatch(/script#/);
    expect(findInlineScriptHazard(KERNEL_UNCLOSED_OPENER + JSON.stringify(message))).toBeNull();
  });
});
