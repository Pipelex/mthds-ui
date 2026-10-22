import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { GraphSpec } from "@graph/types";
import { GraphSpecValidationError } from "@graph/validateGraphSpec";
import { makeFailedRunSpec, makeMinimalSpec } from "@graph/__tests__/testUtils";
import { GraphViewer, type GraphViewerProps } from "../GraphViewer";
import { GRAPH_ERROR_STATE_TITLE, GraphFailureBoundary } from "../GraphErrorState";
import { describeGraphFailure, readGraphSpec } from "../graphFailure";

/** A spec whose second pipe is of a class this viewer does not know. */
function unknownPipeTypeSpec(): GraphSpec {
  const spec = makeMinimalSpec(2);
  (spec.nodes[1] as { pipe_type: string }).pipe_type = "PipeTeleport";
  return spec;
}

/**
 * A failed run as a runtime predating the problem document writes it: every
 * failed node's `error` is `{ error_type, message, stack, caller_facing }`.
 */
function legacyErrorSpec(): GraphSpec {
  const spec = makeFailedRunSpec();
  for (const node of spec.nodes) {
    if (node.status !== "failed") continue;
    (node as { error: unknown }).error = {
      error_type: "PipeRunError",
      message: "The function raised an error.",
      stack: "Traceback (most recent call last): …",
      caller_facing: false,
    };
  }
  return spec;
}

const UNKNOWN_PIPE_TYPE_FAILURE =
  'GraphSpec validation failed at nodes[1].pipe_type: unrecognized pipe class "PipeTeleport"';
const LEGACY_ERROR_FAILURE =
  "GraphSpec validation failed at nodes[0].error.type: expected a string, got undefined";

function render(props: GraphViewerProps): string {
  return renderToStaticMarkup(<GraphViewer {...props} />);
}

/** React escapes quotes in text; compare against the text as markup carries it. */
function asMarkup(text: string): string {
  return text.replace(/"/g, "&quot;");
}

describe("describeGraphFailure", () => {
  it("gives a refused spec's own message, which names the location", () => {
    const error = new GraphSpecValidationError("nodes[2].error.type", "expected a string");
    expect(describeGraphFailure(error)).toBe(
      "GraphSpec validation failed at nodes[2].error.type: expected a string",
    );
  });

  it("names any other error's kind beside its message", () => {
    expect(describeGraphFailure(new TypeError("x is undefined"))).toBe("TypeError: x is undefined");
  });

  it("reads a thrown value that is no error", () => {
    expect(describeGraphFailure("no layout")).toBe("no layout");
  });
});

describe("readGraphSpec", () => {
  it("reads no spec as nothing to draw, which is no failure", () => {
    expect(readGraphSpec(null)).toEqual({ graphspec: null, failure: null });
  });

  it("returns an accepted spec itself", () => {
    const spec = makeMinimalSpec(2);
    expect(readGraphSpec(spec)).toEqual({ graphspec: spec, failure: null });
    expect(readGraphSpec(spec).graphspec).toBe(spec);
  });

  it("returns the refusal of an unknown pipe class instead of throwing it", () => {
    const reading = readGraphSpec(unknownPipeTypeSpec());
    expect(reading.graphspec).toBeNull();
    expect(reading.failure).toContain(UNKNOWN_PIPE_TYPE_FAILURE);
  });

  it("returns the refusal of a failed node's legacy error instead of throwing it", () => {
    const reading = readGraphSpec(legacyErrorSpec());
    expect(reading.graphspec).toBeNull();
    expect(reading.failure).toBe(LEGACY_ERROR_FAILURE);
  });
});

describe("GraphViewer, given a spec the validator refuses", () => {
  it("draws the error state for an unknown pipe class, and does not throw", () => {
    let markup = "";
    expect(() => {
      markup = render({ graph: { graphSpec: unknownPipeTypeSpec() } });
    }).not.toThrow();
    expect(markup).toContain('role="alert"');
    expect(markup).toContain(GRAPH_ERROR_STATE_TITLE);
    expect(markup).toContain(asMarkup(UNKNOWN_PIPE_TYPE_FAILURE));
    expect(markup).toContain("react-flow-container--failed");
    // The graph is not drawn, so neither is the flow, its toolbar or its panel.
    expect(markup).not.toContain("react-flow__renderer");
    expect(markup).not.toContain("detail-panel");
  });

  it("draws the error state for a failed node's legacy error, and does not throw", () => {
    let markup = "";
    expect(() => {
      markup = render({ graph: { graphSpec: legacyErrorSpec() } });
    }).not.toThrow();
    expect(markup).toContain('role="alert"');
    expect(markup).toContain(LEGACY_ERROR_FAILURE);
  });

  it("themes the error state like the graph it replaces", () => {
    const markup = render({ graph: { graphSpec: unknownPipeTypeSpec() }, theme: "light" });
    expect(markup).toContain("react-flow-container--theme-light");
    expect(markup).toContain("react-flow-container--mode-light");
  });

  it("lets a still error state take its message's height, and keeps it readable", () => {
    const markup = render({ graph: { graphSpec: unknownPipeTypeSpec() }, interactive: false });
    expect(markup).toContain("react-flow-container--still");
    expect(markup).toContain("react-flow-container--failed");
    // No inline height, and not inert, which would hide the alert from a screen reader.
    expect(markup).not.toContain("height:");
    expect(markup).not.toContain("inert");
  });
});

describe("GraphViewer, given a spec the validator accepts", () => {
  it("draws the flow as before, with no error state", () => {
    const markup = render({ graph: { graphSpec: makeMinimalSpec(3) } });
    expect(markup).toContain("react-flow__renderer");
    expect(markup).not.toContain("graph-error-state");
    expect(markup).not.toContain("react-flow-container--failed");
    expect(markup).not.toContain('role="alert"');
  });

  it("keeps a still drawing inert, at the placeholder height", () => {
    const markup = render({ graph: { graphSpec: makeMinimalSpec(3) }, interactive: false });
    expect(markup).toContain("inert");
    expect(markup).toContain("height:");
  });

  it("draws nothing for no spec, which is no failure", () => {
    const markup = render({ graph: null });
    expect(markup).toContain("react-flow__renderer");
    expect(markup).not.toContain("graph-error-state");
  });
});

describe("GraphFailureBoundary", () => {
  const props = { resetKey: "spec-a", fallback: () => null, children: () => null };

  it("records what its children threw, in the error state's words", () => {
    const error = new GraphSpecValidationError("nodes[b].kind", "expected a pipe-call node");
    expect(GraphFailureBoundary.getDerivedStateFromError(error)).toEqual({
      failure: "GraphSpec validation failed at nodes[b].kind: expected a pipe-call node",
    });
  });

  it("keeps a failure while the spec is the same one", () => {
    const state = { failure: "refused", resetKey: "spec-a" };
    expect(GraphFailureBoundary.getDerivedStateFromProps(props, state)).toBeNull();
  });

  it("clears a failure when a new spec arrives", () => {
    const state = { failure: "refused", resetKey: "spec-a" };
    expect(
      GraphFailureBoundary.getDerivedStateFromProps({ ...props, resetKey: "spec-b" }, state),
    ).toEqual({ failure: null, resetKey: "spec-b" });
  });
});
