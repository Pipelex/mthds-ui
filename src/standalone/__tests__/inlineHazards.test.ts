/**
 * The checks `scripts/build-standalone.mjs` runs before inlining the bundle
 * into `graph-standalone.html`. The build fails on any hazard they report, so
 * what matters is that they report every sequence the HTML tokenizer acts on
 * inside the element, and nothing esbuild's own output legitimately contains.
 */
import { describe, it, expect } from "vitest";
import { findInlineScriptHazard, findInlineStyleHazard } from "../../../scripts/inlineHazards.mjs";

describe("findInlineScriptHazard", () => {
  it("passes esbuild's own escaping of an end tag", () => {
    expect(findInlineScriptHazard('const a="<\\/script>",b=`<\\/SCRIPT >`;')).toBeNull();
  });

  it("passes a `<!--` closed before any `<script`, as in today's bundle", () => {
    // The shape an HTML sanitizer's comment regex has, followed later by the
    // viewer's own error messages naming the embed element.
    const js =
      "YS=/<!--(?:-?>|[\\s\\S]*?(?:-->|$))/;" +
      'throw new Error(`<script id="${id}"> lists no .mthds file.`);';
    expect(findInlineScriptHazard(js)).toBeNull();
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
