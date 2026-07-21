import { describe, it, expect } from "vitest";
import { makePipeRef, parsePipeRef } from "@graph/pipeRefs";

describe("parsePipeRef", () => {
  it("parses a bare ref to a null domain path", () => {
    expect(parsePipeRef("compute_score")).toEqual({ domainPath: null, pipeCode: "compute_score" });
  });

  it("parses a qualified ref on the last dot", () => {
    expect(parsePipeRef("scoring.compute_score")).toEqual({
      domainPath: "scoring",
      pipeCode: "compute_score",
    });
  });

  it("keeps a multi-segment domain path intact", () => {
    expect(parsePipeRef("legal.contracts.compute_score")).toEqual({
      domainPath: "legal.contracts",
      pipeCode: "compute_score",
    });
  });

  it("rejects empty and malformed dot forms", () => {
    expect(parsePipeRef("")).toBeNull();
    expect(parsePipeRef(".compute_score")).toBeNull();
    expect(parsePipeRef("scoring.")).toBeNull();
    expect(parsePipeRef("scoring..compute_score")).toBeNull();
  });

  it("treats cross-package refs as opaque", () => {
    expect(parsePipeRef("helpers->clean")).toBeNull();
    expect(parsePipeRef("helpers->lib.clean")).toBeNull();
  });
});

describe("makePipeRef", () => {
  it("renders domain_code.pipe_code", () => {
    expect(makePipeRef("scoring", "compute_score")).toBe("scoring.compute_score");
  });

  it("round-trips through parsePipeRef", () => {
    const ref = makePipeRef("legal.contracts", "compute_score");
    expect(parsePipeRef(ref)).toEqual({
      domainPath: "legal.contracts",
      pipeCode: "compute_score",
    });
  });
});
