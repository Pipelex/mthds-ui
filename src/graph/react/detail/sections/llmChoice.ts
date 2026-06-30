/**
 * Keys, in priority order, under which an inline LLM-choice object may carry its
 * model identifier. `model` is the real field on pipelex's serialized
 * `LLMSetting`; the rest are defensive fallbacks for adjacent shapes.
 */
const LLM_CHOICE_LABEL_KEYS = ["model", "llm_handle", "handle", "llm_name", "name"] as const;

function nonEmptyString(value: unknown): string | undefined {
  if (typeof value !== "string") return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

/**
 * Derive a human-readable model label from a pipe's `llm_choice`, which may be a
 * plain string handle or an inline LLM setting object (serialized pipelex
 * `LLMSetting`, keyed by `model`). Returns `undefined` when no label can be
 * derived — null, empty, or an unrecognized object — so callers can fall back to
 * the runtime-resolved model.
 */
export function labelFromLlmChoice(
  choice: string | Record<string, unknown> | null | undefined,
): string | undefined {
  if (typeof choice === "string") return nonEmptyString(choice);
  if (choice && typeof choice === "object") {
    for (const key of LLM_CHOICE_LABEL_KEYS) {
      const label = nonEmptyString(choice[key]);
      if (label) return label;
    }
  }
  return undefined;
}
