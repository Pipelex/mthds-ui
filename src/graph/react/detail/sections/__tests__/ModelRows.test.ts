import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import type { GraphSpecModelUsage } from "@graph/types";
import { ModelRows } from "../shared";

function ranModel(
  inference_model_name: string,
  model_type: string,
  inference_calls = 1,
): GraphSpecModelUsage {
  return {
    inference_model_name,
    inference_model_id: `${inference_model_name}-id`,
    model_type,
    inference_calls,
    rated_inference_calls: inference_calls,
    cost: 0.01,
  };
}

/** The lines of the Model row, top to bottom: the request first, then what ran. */
function rungs(props: React.ComponentProps<typeof ModelRows>): string[] {
  const html = renderToStaticMarkup(React.createElement(ModelRows, props));
  return [...html.matchAll(/<span(?: class="detail-model-resolved")?>([^<]*)<\/span>/g)].map(
    (match) => match[1],
  );
}

describe("ModelRows", () => {
  it("names the model type of two models that ran under one name", () => {
    // One handle names one model per model type, so a node can call the same name as
    // an LLM and as a judgment model. With equal call counts the two used to print as
    // one line, and nothing said which kind of call it was.
    expect(
      rungs({
        authored: "@default-general",
        modelsRan: [ranModel("gpt-6-luna", "llm"), ranModel("gpt-6-luna", "judgment")],
      }),
    ).toEqual(["@default-general", "gpt-6-luna · LLM (1)", "gpt-6-luna · judgment (1)"]);
  });

  it("names the model type only where a name is shared", () => {
    expect(
      rungs({
        modelsRan: [
          ranModel("gpt-6-luna", "llm", 3),
          ranModel("gpt-6-luna", "judgment", 2),
          ranModel("claude-4.6-sonnet", "llm", 1),
        ],
      }),
    ).toEqual(["gpt-6-luna · LLM (3)", "gpt-6-luna · judgment (2)", "claude-4.6-sonnet (1)"]);
  });

  it("prints a model type it has no words for as the type itself", () => {
    expect(
      rungs({ modelsRan: [ranModel("engine", "llm"), ranModel("engine", "doc_gen")] }),
    ).toEqual(["engine · LLM (1)", "engine · doc gen (1)"]);
  });

  it("lists several models that ran with their call counts and no type", () => {
    expect(
      rungs({
        authored: "$writing-factual",
        handle: "@default-premium",
        modelsRan: [ranModel("claude-4.6-sonnet", "llm", 2), ranModel("gpt-4o-mini", "llm", 1)],
      }),
    ).toEqual(["$writing-factual", "@default-premium", "claude-4.6-sonnet (2)", "gpt-4o-mini (1)"]);
  });

  it("collapses a concrete handle into the one model that ran", () => {
    expect(
      rungs({
        authored: "@default-general",
        handle: "claude-4.6-sonnet",
        modelsRan: [ranModel("claude-4.6-sonnet", "llm", 2)],
      }),
    ).toEqual(["@default-general", "claude-4.6-sonnet"]);
  });

  it("collapses an authored name that resolved to itself", () => {
    expect(rungs({ authored: "claude-4.6-sonnet", handle: "claude-4.6-sonnet" })).toEqual([
      "claude-4.6-sonnet",
    ]);
    expect(
      rungs({
        authored: "claude-4.6-sonnet",
        handle: "claude-4.6-sonnet",
        modelsRan: [ranModel("claude-4.6-sonnet", "llm")],
      }),
    ).toEqual(["claude-4.6-sonnet"]);
  });

  it("shows the request alone when nothing ran, and nothing when nothing is known", () => {
    expect(rungs({ authored: "@default-general", handle: "@default-general" })).toEqual([
      "@default-general",
    ]);
    expect(rungs({ authored: null, handle: undefined, modelsRan: [] })).toEqual([]);
  });
});
