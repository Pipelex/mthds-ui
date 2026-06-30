import { describe, it, expect } from "vitest";
import { labelFromLlmChoice } from "@graph/react/detail/sections/llmChoice";

describe("labelFromLlmChoice", () => {
  describe("string handle form", () => {
    it("returns a plain string handle as-is", () => {
      expect(labelFromLlmChoice("base_claude")).toBe("base_claude");
    });

    it("trims surrounding whitespace", () => {
      expect(labelFromLlmChoice("  gpt-4o  ")).toBe("gpt-4o");
    });

    it("returns undefined for an empty / whitespace-only string", () => {
      expect(labelFromLlmChoice("")).toBeUndefined();
      expect(labelFromLlmChoice("   ")).toBeUndefined();
    });
  });

  describe("null / undefined", () => {
    it("returns undefined for null", () => {
      expect(labelFromLlmChoice(null)).toBeUndefined();
    });

    it("returns undefined for undefined", () => {
      expect(labelFromLlmChoice(undefined)).toBeUndefined();
    });
  });

  describe("inline LLMSetting object form", () => {
    it("returns the `model` field (the real pipelex LLMSetting key)", () => {
      expect(labelFromLlmChoice({ model: "gpt-4o", temperature: 0.5, max_tokens: null })).toBe(
        "gpt-4o",
      );
    });

    it("falls back to llm_handle / handle / llm_name / name when model is absent", () => {
      expect(labelFromLlmChoice({ llm_handle: "base_claude" })).toBe("base_claude");
      expect(labelFromLlmChoice({ handle: "h" })).toBe("h");
      expect(labelFromLlmChoice({ llm_name: "n" })).toBe("n");
      expect(labelFromLlmChoice({ name: "x" })).toBe("x");
    });

    it("prefers `model` over the fallback keys", () => {
      expect(labelFromLlmChoice({ model: "primary", llm_handle: "secondary" })).toBe("primary");
    });

    it("trims the extracted object value", () => {
      expect(labelFromLlmChoice({ model: "  claude-opus  " })).toBe("claude-opus");
    });

    it("returns undefined when no recognized key holds a non-empty string", () => {
      expect(labelFromLlmChoice({ temperature: 0.5, max_tokens: 1000 })).toBeUndefined();
      expect(labelFromLlmChoice({})).toBeUndefined();
    });

    it("ignores a non-string model value and a whitespace-only string value", () => {
      expect(labelFromLlmChoice({ model: 123 as unknown as string })).toBeUndefined();
      expect(labelFromLlmChoice({ model: "   " })).toBeUndefined();
    });

    it("skips an empty `model` and uses the next recognized key", () => {
      expect(labelFromLlmChoice({ model: "", llm_handle: "fallback" })).toBe("fallback");
    });
  });
});
