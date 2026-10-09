import { describe, it, expect } from "vitest";
import {
  MERGED_EXECUTION_DATA_TYPES,
  dumpableExecutionData,
  shouldDumpExecutionData,
} from "@graph/react/detail/sections/executionData";

const MERGED = [
  "PipeLLM",
  "PipeImgGen",
  "PipeExtract",
  "PipeSearch",
  "PipeStructure",
  "PipeCompose",
  "PipeDocGen",
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

describe("dumpableExecutionData", () => {
  it("never dumps a PipeDocGen's stored document url, and keeps its other keys in order", () => {
    const data = {
      format: "pdf",
      source: "layout",
      resolved_model: "reportlab-pdf",
      filename: "notice.pdf",
      url: "data:application/pdf;base64,JVBERi0=",
    };
    expect(dumpableExecutionData("PipeDocGen", data)).toEqual([
      ["format", "pdf"],
      ["source", "layout"],
      ["resolved_model", "reportlab-pdf"],
      ["filename", "notice.pdf"],
    ]);
  });

  it("dumps every key of another pipe type, a url included", () => {
    const data = { url: "https://example.com/page", runtime_value: 1 };
    expect(dumpableExecutionData("PipeFunc", data)).toEqual([
      ["url", "https://example.com/page"],
      ["runtime_value", 1],
    ]);
  });
});
