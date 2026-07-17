import { describe, expect, it } from "vitest";

import type { PipeLLMBlueprint } from "@graph/types";

import { mergeBundles } from "../mergeBundles";
import { parseMthdsBundle } from "../parseMthdsBundle";
import { UNKNOWN_DOMAIN } from "../types";

function parsed(toml: string) {
  return parseMthdsBundle(toml).bundle;
}

describe("mergeBundles", () => {
  it("merges same-domain bundles into one namespace", () => {
    const merged = mergeBundles([
      parsed(`
domain = "d"
main_pipe = "a"
description = "First file"
[pipe.a]
type = "PipeLLM"
description = "A"
output = "Text"
prompt = "Go"
`),
      parsed(`
domain = "d"
[pipe.b]
type = "PipeLLM"
description = "B"
output = "Text"
prompt = "Go"
`),
    ]);
    expect(Object.keys(merged.domains)).toEqual(["d"]);
    expect(Object.keys(merged.domains.d.pipes).sort()).toEqual(["a", "b"]);
    expect(merged.mainDomain).toBe("d");
    expect(merged.mainPipe).toBe("a");
    expect(merged.description).toBe("First file");
    expect(merged.diagnostics).toEqual([]);
  });

  it("pins mainDomain to the bundle that declares main_pipe", () => {
    const merged = mergeBundles([
      parsed(`
domain = "shared"
[pipe.clean]
type = "PipeLLM"
description = "Clean text"
output = "Text"
prompt = "Go"
`),
      parsed(`
domain = "app"
main_pipe = "run"
[pipe.run]
type = "PipeLLM"
description = "Entry"
output = "Text"
prompt = "Go"
`),
    ]);
    expect(merged.mainDomain).toBe("app");
    expect(merged.mainPipe).toBe("run");
  });

  it("keeps the first declaration on duplicate codes and records diagnostics", () => {
    const merged = mergeBundles([
      parsed(`
domain = "d"
[concept.Thing]
description = "Original"
[pipe.p]
type = "PipeLLM"
description = "Original pipe"
output = "Text"
prompt = "Go"
`),
      parsed(`
domain = "d"
[concept.Thing]
description = "Shadowed"
[pipe.p]
type = "PipeCompose"
description = "Shadowed pipe"
output = "Text"
template = "x"
`),
    ]);
    expect(merged.domains.d.concepts.Thing.description).toBe("Original");
    expect(merged.domains.d.pipes.p.type).toBe("PipeLLM");
    expect(merged.diagnostics.map((d) => d.code).sort()).toEqual([
      "duplicate-concept",
      "duplicate-pipe",
    ]);
  });

  it("enriches concept stubs from declarations in sibling files", () => {
    const merged = mergeBundles([
      parsed(`
domain = "d"
[pipe.uses]
type = "PipeLLM"
description = "Uses a concept from the other file"
inputs = { thing = "Shared" }
output = "Shared"
prompt = "Go"
`),
      parsed(`
domain = "d"
[concept.Shared]
description = "Declared in file two"
refines = "Text"
`),
    ]);
    const pipe = merged.domains.d.pipes.uses as PipeLLMBlueprint;
    expect(pipe.inputs.thing.concept.description).toBe("Declared in file two");
    expect(pipe.output.concept.refines).toBe("native.Text");
  });

  it("enriches cross-domain refs when the other domain is part of the merge", () => {
    const merged = mergeBundles([
      parsed(`
domain = "main"
[pipe.uses]
type = "PipeLLM"
description = "Uses other-domain concept"
inputs = { thing = "other.Widget" }
output = "Text"
prompt = "Go"
`),
      parsed(`
domain = "other"
[concept.Widget]
description = "A widget"
`),
    ]);
    const pipe = merged.domains.main.pipes.uses as PipeLLMBlueprint;
    expect(pipe.inputs.thing.concept.description).toBe("A widget");
    expect(pipe.inputs.thing.concept.domain_code).toBe("other");
  });

  it("groups domainless bundles under the unknown domain", () => {
    const merged = mergeBundles([
      parsed(`
[pipe.wip]
type = "PipeLLM"
description = "WIP"
output = "Text"
prompt = "Go"
`),
    ]);
    expect(Object.keys(merged.domains)).toEqual([UNKNOWN_DOMAIN]);
    expect(merged.mainDomain).toBeNull();
  });

  it("returns an empty set for no bundles", () => {
    const merged = mergeBundles([]);
    expect(merged.domains).toEqual({});
    expect(merged.mainDomain).toBeNull();
    expect(merged.mainPipe).toBeNull();
    expect(merged.diagnostics).toEqual([]);
  });
});
