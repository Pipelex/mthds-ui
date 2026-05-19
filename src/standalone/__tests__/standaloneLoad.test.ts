/**
 * End-to-end standalone load test. Mirrors the data-load sequence the
 * standalone adapter runs once `pipelex-config` / `pipelex-graphspec` are
 * available, and asserts every malformed-input failure is observable (thrown)
 * rather than silently swallowed.
 */
import { describe, it, expect } from "vitest";
import { validateGraphSpec } from "@graph/validateGraphSpec";
import { buildViewerProps, type StandaloneViewerProps } from "../viewerProps";

/** Replays the adapter's load steps: parse → validate → build props. */
function loadStandalone(configText: string, graphspecText: string): StandaloneViewerProps {
  const rawConfig = JSON.parse(configText);
  const rawGraphspec = JSON.parse(graphspecText);
  const graphspec = rawGraphspec === null ? null : validateGraphSpec(rawGraphspec);
  return buildViewerProps(rawConfig, graphspec);
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

describe("standalone load", () => {
  it("loads a valid config + graphspec", () => {
    const props = loadStandalone(JSON.stringify({ direction: "TB" }), VALID_GRAPHSPEC);
    expect(props.graphspec?.nodes).toHaveLength(1);
    expect(props.initialDirection).toBe("TB");
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
