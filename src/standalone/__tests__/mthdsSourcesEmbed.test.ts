/**
 * The `mthds-sources` embed: a page carrying a method's `.mthds` files, from
 * which the standalone bundle builds the static graph itself. Every test goes
 * through `loadStandaloneEmbeds`, the function the adapter calls, fed the text
 * an embedder writes under the contract in `docs/static-graph.md`.
 */
import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { VALIDATION_STATE } from "@graph/types";
import { buildStaticGraphSpecFromToml } from "@static-graph/buildStaticGraphSpec";
import { serializeMthdsSourcesEmbed } from "@static-graph/mthdsSourcesEmbed";
import type { MthdsSource } from "@static-graph/sourceOrder";
import { loadStandaloneEmbeds } from "../loadEmbeds";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const MULTI_FILE_ENTRY = path.join(
  REPO_ROOT,
  "data/mthds-corpus/entries/feature_multi_file_library_research_brief",
);

/** Load a page whose sources element was written the way a host writes it. */
function loadSources(sources: readonly MthdsSource[], configText: string | null = null) {
  return loadStandaloneEmbeds({
    config: configText,
    graphspec: null,
    mthdsSources: serializeMthdsSourcesEmbed(sources),
  });
}

function summarizer(description: string): string {
  return `domain = "demo"
main_pipe = "summarize"

[pipe.summarize]
type = "PipeLLM"
description = ${JSON.stringify(description)}
inputs = { text = "Text" }
output = "Text"
prompt = "Summarize: @text"
`;
}

const TRANSLATOR = `domain = "demo"
main_pipe = "translate"

[pipe.translate]
type = "PipeLLM"
description = "Translate the text"
inputs = { text = "Text" }
output = "Text"
prompt = "Translate: @text"
`;

describe("mthds-sources embed", () => {
  it("builds the static graph of a single-file method", () => {
    const props = loadSources([{ name: "bundle.mthds", content: summarizer("Summarize it") }]);
    expect(props.graphspec?.meta?.mode).toBe("static");
    expect(props.graphspec?.pipeline_ref).toEqual({ domain: "demo", main_pipe: "summarize" });
    expect(props.graphspec?.nodes.map((node) => node.id)).toEqual(["demo.summarize"]);
  });

  it("shows no validation widget for a method the builder read without a note", () => {
    const props = loadSources([{ name: "bundle.mthds", content: summarizer("Summarize it") }]);
    expect(props.validationState).toBeUndefined();
    expect(props.validationIssues).toBeUndefined();
  });

  it("applies the config embed beside it", () => {
    const props = loadSources(
      [{ name: "bundle.mthds", content: summarizer("Summarize it") }],
      JSON.stringify({ direction: "TB", foldMode: "folded" }),
    );
    expect(props.initialDirection).toBe("TB");
    expect(props.initialFoldMode).toBe("folded");
  });

  describe("file order", () => {
    it("leads with bundle.mthds when several files declare main_pipe", () => {
      const props = loadSources([
        { name: "translate.mthds", content: TRANSLATOR },
        { name: "bundle.mthds", content: summarizer("Summarize it") },
      ]);
      expect(props.graphspec?.pipeline_ref?.main_pipe).toBe("summarize");
    });

    it("leads with the file declaring main_pipe, so its declaration wins a clash", () => {
      // Both files define `summarize`; the merge keeps the first declaration, so
      // the entry point must lead even when the page lists a helper first.
      const helper = summarizer("From the helper").replace('main_pipe = "summarize"\n', "");
      const props = loadSources([
        { name: "helper.mthds", content: helper },
        { name: "entry.mthds", content: summarizer("From the entry point") },
      ]);
      expect(props.graphspec?.pipe_registry?.["demo.summarize"]?.description).toBe(
        "From the entry point",
      );
    });

    it("draws the corpus's multi-file method whatever order the page lists it in", () => {
      const names = readdirSync(MULTI_FILE_ENTRY)
        .filter((name) => name.endsWith(".mthds"))
        .sort()
        .reverse();
      const sources: MthdsSource[] = names.map((name) => ({
        name,
        content: readFileSync(path.join(MULTI_FILE_ENTRY, name), "utf8"),
      }));
      expect(sources[0].name).not.toBe("bundle.mthds");

      const bundleFirst = [
        ...sources.filter((file) => file.name === "bundle.mthds"),
        ...sources.filter((file) => file.name !== "bundle.mthds"),
      ];
      const expected = buildStaticGraphSpecFromToml(bundleFirst.map((file) => file.content));
      expect(expected.diagnostics).toEqual([]);

      const props = loadSources(sources);
      expect(props.graphspec).toEqual(expected.spec);
      expect(props.validationState).toBeUndefined();
      // More than the signature stub the root file alone would draw.
      expect(props.graphspec?.nodes.length).toBeGreaterThan(1);
    });
  });

  describe("text that looks like HTML", () => {
    const HOSTILE = 'Ends at </script><script>alert("x")</script> and opens <!-- a comment';

    it("round-trips a TOML containing </script> into the drawn method", () => {
      const props = loadSources([{ name: "bundle.mthds", content: summarizer(HOSTILE) }]);
      expect(props.graphspec?.pipe_registry?.["demo.summarize"]?.description).toBe(HOSTILE);
    });
  });

  describe("the builder's notes", () => {
    it("reach the viewer as unvalidated static issues", () => {
      const props = loadSources([
        {
          name: "bundle.mthds",
          content: `domain = "demo"
main_pipe = "flow"

[pipe.flow]
type = "PipeSequence"
description = "Run a step that is never declared"
inputs = { text = "Text" }
output = "Text"
steps = [{ pipe = "missing_step", result = "out" }]
`,
        },
      ]);
      expect(props.validationState).toBe(VALIDATION_STATE.UNVALIDATED);
      expect(props.validationIssues?.length).toBeGreaterThan(0);
      expect(props.validationIssues?.every((issue) => issue.origin === "static")).toBe(true);
    });

    it("shows a file that does not parse instead of an empty canvas", () => {
      const props = loadSources([{ name: "bundle.mthds", content: 'domain = "demo"\n[pipe.x' }]);
      expect(props.validationState).toBe(VALIDATION_STATE.UNVALIDATED);
      expect(props.validationIssues?.some((issue) => issue.severity === "error")).toBe(true);
    });

    it("name the file a parse error is in when several are embedded", () => {
      const props = loadSources([
        { name: "bundle.mthds", content: summarizer("Summarize it") },
        { name: "broken.mthds", content: 'domain = "demo"\n[pipe.x' },
      ]);
      const errors = props.validationIssues?.filter((issue) => issue.severity === "error");
      expect(errors?.length).toBeGreaterThan(0);
      expect(errors?.every((issue) => issue.file === "broken.mthds")).toBe(true);
    });
  });

  it("refuses a page that embeds both a GraphSpec and method sources", () => {
    const spec = buildStaticGraphSpecFromToml(summarizer("Summarize it")).spec;
    expect(() =>
      loadStandaloneEmbeds({
        config: null,
        graphspec: JSON.stringify(spec),
        mthdsSources: serializeMthdsSourcesEmbed([
          { name: "bundle.mthds", content: summarizer("Summarize it") },
        ]),
      }),
    ).toThrow(/embeds both/);
  });

  it("treats an empty sources element like an absent one", () => {
    const props = loadStandaloneEmbeds({ config: "{}", graphspec: null, mthdsSources: "\n  \n" });
    expect(props.graphspec).toBeNull();
  });

  it("names the embed when its JSON does not parse", () => {
    expect(() =>
      loadStandaloneEmbeds({ config: null, graphspec: null, mthdsSources: "[{" }),
    ).toThrow(/mthds-sources/);
  });

  it("refuses a sources element holding JSON null instead of treating it as absent", () => {
    expect(() =>
      loadStandaloneEmbeds({ config: null, graphspec: null, mthdsSources: "null" }),
    ).toThrow(/JSON array/);
    const spec = buildStaticGraphSpecFromToml(summarizer("Summarize it")).spec;
    expect(() =>
      loadStandaloneEmbeds({ config: null, graphspec: JSON.stringify(spec), mthdsSources: "null" }),
    ).toThrow(/embeds both/);
  });
});
