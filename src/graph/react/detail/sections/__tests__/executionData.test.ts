import { describe, it, expect } from "vitest";
import {
  MERGED_EXECUTION_DATA_TYPES,
  shouldDumpExecutionData,
} from "@graph/react/detail/sections/executionData";

const MERGED = [
  "PipeLLM",
  "PipeImgGen",
  "PipeExtract",
  "PipeSearch",
  "PipeStructure",
  "PipeCompose",
  "PipeSequence",
  "PipeParallel",
  "PipeCondition",
  "PipeBatch",
];

describe("MERGED_EXECUTION_DATA_TYPES", () => {
  it("contains every pipe type whose runtime data is merged into its blueprint section", () => {
    for (const t of MERGED) {
      expect(MERGED_EXECUTION_DATA_TYPES.has(t)).toBe(true);
    }
  });

  it("does not contain types without a merged blueprint section", () => {
    expect(MERGED_EXECUTION_DATA_TYPES.has("PipeFunc")).toBe(false);
    expect(MERGED_EXECUTION_DATA_TYPES.has("PipeSignature")).toBe(false);
  });
});

describe("shouldDumpExecutionData", () => {
  describe("merged types", () => {
    it("suppresses the dump when the blueprint resolved (data is shown in the section)", () => {
      for (const t of MERGED) {
        expect(shouldDumpExecutionData(t, true)).toBe(false);
      }
    });

    it("dumps when the blueprint did NOT resolve, so runtime data is not lost (#1)", () => {
      for (const t of MERGED) {
        expect(shouldDumpExecutionData(t, false)).toBe(true);
      }
    });
  });

  describe("non-merged / unknown types", () => {
    it("always dumps PipeFunc regardless of blueprint resolution", () => {
      expect(shouldDumpExecutionData("PipeFunc", true)).toBe(true);
      expect(shouldDumpExecutionData("PipeFunc", false)).toBe(true);
    });

    it("always dumps PipeSignature", () => {
      expect(shouldDumpExecutionData("PipeSignature", true)).toBe(true);
      expect(shouldDumpExecutionData("PipeSignature", false)).toBe(true);
    });

    it("always dumps an unknown/future pipe type", () => {
      expect(shouldDumpExecutionData("PipeBrandNew", true)).toBe(true);
      expect(shouldDumpExecutionData("PipeBrandNew", false)).toBe(true);
    });
  });
});
