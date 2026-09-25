/**
 * End-to-end standalone load test for a page embedding a GraphSpec. Runs the
 * loader the adapter calls once `pipelex-config` / `pipelex-graphspec` are
 * available, and asserts every malformed-input failure is observable (thrown)
 * rather than silently swallowed. The `mthds-sources` embed has its own suite
 * in `mthdsSourcesEmbed.test.ts`.
 */
import { describe, it, expect } from "vitest";
import type { StandaloneViewerProps } from "../viewerProps";
import { isBlankScriptText, parseJsonScriptText } from "../readJsonScript";
import { loadStandaloneEmbeds } from "../loadEmbeds";

function loadStandalone(configText: string, graphspecText: string): StandaloneViewerProps {
  return loadStandaloneEmbeds({ config: configText, graphspec: graphspecText, mthdsSources: null });
}

const VALID_GRAPHSPEC = JSON.stringify({
  meta: { format: "mthds" },
  nodes: [
    {
      id: "n0",
      kind: "operator",
      pipe_code: "summarize",
      pipe_type: "PipeLLM",
      description: "Summarize the text",
      domain_code: "demo",
      status: "succeeded",
      io: { inputs: [], outputs: [] },
    },
  ],
  edges: [],
});

describe("parseJsonScriptText", () => {
  it("returns null for empty content", () => {
    expect(parseJsonScriptText("", "pipelex-graphspec")).toBeNull();
  });

  it("returns null for whitespace-only content (omitted/empty embed)", () => {
    // The standalone HTML indents the JSON placeholders onto their own lines,
    // so an embed that substitutes an empty value leaves the script body as
    // whitespace rather than "". This must still resolve to the null/initial
    // state, not throw on JSON.parse. Regression guard for PR #49.
    expect(parseJsonScriptText("\n      \n    ", "pipelex-graphspec")).toBeNull();
  });

  it("returns null for null/undefined content", () => {
    expect(parseJsonScriptText(null, "pipelex-config")).toBeNull();
    expect(parseJsonScriptText(undefined, "pipelex-config")).toBeNull();
  });

  it("parses valid JSON, trimming surrounding whitespace", () => {
    expect(parseJsonScriptText('\n      {"direction":"TB"}\n    ', "pipelex-config")).toEqual({
      direction: "TB",
    });
  });

  it("throws with the script id on malformed JSON", () => {
    expect(() => parseJsonScriptText("{not json", "pipelex-config")).toThrow(/pipelex-config/);
  });
});

describe("isBlankScriptText", () => {
  it("counts missing, empty and whitespace-only text as absent", () => {
    expect(isBlankScriptText(null)).toBe(true);
    expect(isBlankScriptText(undefined)).toBe(true);
    expect(isBlankScriptText("")).toBe(true);
    expect(isBlankScriptText("\n      \n    ")).toBe(true);
  });

  it("counts JSON null as present, unlike parseJsonScriptText's result", () => {
    expect(isBlankScriptText("null")).toBe(false);
    expect(parseJsonScriptText("null", "mthds-sources")).toBeNull();
  });
});

describe("standalone load", () => {
  it("loads a valid config + graphspec", () => {
    const props = loadStandalone(JSON.stringify({ direction: "TB" }), VALID_GRAPHSPEC);
    expect(props.graphspec?.nodes).toHaveLength(1);
    expect(props.initialDirection).toBe("TB");
  });

  it("renders the initial state (null graphspec) for an empty graphspec embed", () => {
    // An embedder may leave the graphspec placeholder empty to show the
    // initial/null state. With multi-line placeholders that arrives as
    // whitespace — it must yield a null graphspec, not the error screen.
    const props = loadStandalone("{}", "\n      \n    ");
    expect(props.graphspec).toBeNull();
  });

  it("throws on malformed config JSON", () => {
    expect(() => loadStandalone("{not json", VALID_GRAPHSPEC)).toThrow();
  });

  it("throws on malformed graphspec JSON", () => {
    expect(() => loadStandalone("{}", "{not json")).toThrow();
  });

  it("throws on a bad direction in the config", () => {
    expect(() =>
      loadStandalone(JSON.stringify({ direction: "sideways" }), VALID_GRAPHSPEC),
    ).toThrow(/Invalid direction/);
  });

  it("throws on a graphspec that is not pipelex output (missing meta.format)", () => {
    const notPipelex = JSON.stringify({ nodes: [], edges: [] });
    expect(() => loadStandalone("{}", notPipelex)).toThrow(/GraphSpec validation failed/);
  });

  it("throws on a graphspec with a malformed node", () => {
    const badNode = JSON.stringify({
      meta: { format: "mthds" },
      nodes: [{ id: "n0", kind: "operator", pipe_type: "PipeLLM", status: "succeeded" }],
      edges: [],
    });
    expect(() => loadStandalone("{}", badNode)).toThrow(/GraphSpec validation failed/);
  });
});
