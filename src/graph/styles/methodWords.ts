// The words a method gives the person who runs it, read the same way by the
// graph's simple style and by the run timeline's simple style:
//
// - a step's wording: its `activity` ("Reading the NDA"), else its
//   description, else its humanized code (MTHDS, "What a Run Shows");
// - a condition's outcome words: the label, description and tone an outcome
//   table carries (MTHDS, "Outcome Labels");
// - which steps are plumbing, hidden from a view of a run by their pipe type.
//
// Pure and React-free.

import type {
  ConceptInfo,
  OutcomeTone,
  OutcomeWords,
  PipeBlueprintUnion,
  PipeConditionBlueprint,
  StuffSpecInfo,
} from "@graph/types";
import { BINDING_STEP_TYPE, isOutcomeTone } from "@graph/types";
import { humanizeIdentifier, outcomeLabel, sentenceCase } from "./humanize";

// ─── A step's wording ────────────────────────────────────────────────────────

/** Where a step's title came from: the method's words for a person, its words for a builder, or its code. */
export const WORDING_SOURCE = {
  ACTIVITY: "activity",
  DESCRIPTION: "description",
  CODE: "code",
} as const;

export type WordingSource = (typeof WORDING_SOURCE)[keyof typeof WORDING_SOURCE];

/** A step's title in plain words, and where it came from. */
export interface StepWording {
  title: string;
  source: WordingSource;
}

/** What a step's wording is read from: a registry pipe or a graph node, which both carry the two texts. */
export interface StepWordingSource {
  activity?: string | null;
  description?: string | null;
}

/**
 * A step's title in plain words: its `activity` when it states one, the words
 * written for the person watching a run; else its description, written for the
 * people who build methods; else its humanized code. Each authored text is
 * shown as its author wrote it, whitespace collapsed and one closing period
 * dropped (`sentenceCase`).
 */
export function stepWording(
  pipe: StepWordingSource | null | undefined,
  pipeCode: string,
): StepWording {
  const activity = sentenceCase(pipe?.activity ?? "");
  if (activity) return { title: activity, source: WORDING_SOURCE.ACTIVITY };
  const described = sentenceCase(pipe?.description ?? "");
  if (described) return { title: described, source: WORDING_SOURCE.DESCRIPTION };
  return { title: humanizeIdentifier(pipeCode), source: WORDING_SOURCE.CODE };
}

/** A pipe's `activity` as a title, or `null` when it states none. */
export function activityTitle(pipe: StepWordingSource | null | undefined): string | null {
  return sentenceCase(pipe?.activity ?? "") || null;
}

// ─── A condition's outcome words ─────────────────────────────────────────────

/** An outcome's words for people, each `null` when the method does not give it. */
export interface OutcomeWordsRead {
  label: string | null;
  description: string | null;
  /** One of the four tones; a word that is none of them reads as no tone. */
  tone: OutcomeTone | null;
}

function nonEmpty(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.replace(/\s+/g, " ").trim();
  return trimmed.length > 0 ? trimmed : null;
}

function readWords(words: OutcomeWords | null | undefined): OutcomeWordsRead | null {
  if (!words || typeof words !== "object") return null;
  const read: OutcomeWordsRead = {
    label: nonEmpty(words.label),
    description: nonEmpty(words.description),
    tone: isOutcomeTone(words.tone) ? words.tone : null,
  };
  return read.label !== null || read.description !== null || read.tone !== null ? read : null;
}

/**
 * The words a condition gives one of its outcomes: the outcome map's key, or
 * `null` for its default outcome. `null` when the condition is unknown or wrote
 * that outcome as a bare pipe reference, which carries no words.
 */
export function outcomeWordsOf(
  condition: PipeBlueprintUnion | null | undefined,
  key: string | null,
): OutcomeWordsRead | null {
  if (condition?.type !== "PipeCondition") return null;
  if (key === null) return readWords(condition.default_outcome_words);
  const words = condition.outcome_words;
  if (!words || !Object.hasOwn(words, key)) return null;
  return readWords(words[key]);
}

/** The keys of a run graph node's `execution_data` a live run's condition records the words of its outcome under. */
export const SELECTED_OUTCOME_WORDS_KEY = {
  LABEL: "selected_outcome_label",
  DESCRIPTION: "selected_outcome_description",
  TONE: "selected_outcome_tone",
} as const;

/**
 * The words of the outcome a live run's condition took, as its node's
 * `execution_data` records them, or `null` when it records none: a dry run, a
 * runtime that predates them, or an outcome written as a bare pipe reference.
 */
export function selectedOutcomeWords(
  executionData: Record<string, unknown> | null | undefined,
): OutcomeWordsRead | null {
  if (!executionData) return null;
  return readWords({
    label: executionData[SELECTED_OUTCOME_WORDS_KEY.LABEL] as string | null | undefined,
    description: executionData[SELECTED_OUTCOME_WORDS_KEY.DESCRIPTION] as string | null | undefined,
    tone: executionData[SELECTED_OUTCOME_WORDS_KEY.TONE] as string | null | undefined,
  });
}

/** The outcome key a decision's branch is read under when it is the default outcome. */
export const DEFAULT_OUTCOME_KEY = "default";

/**
 * A branch's outcomes as one label, as an arrow or a row says them: each
 * outcome by its label when the condition gives it one, else in plain words
 * (`outcomeLabel`). `outcomes` is the keys joined by `|`, as a static graph
 * tags a branch taken on several (`no_fit | default`), where `default` names
 * the default outcome.
 */
export function outcomeArrowLabel(
  outcomes: string,
  condition: PipeBlueprintUnion | null | undefined,
): string {
  const keys = outcomes
    .split("|")
    .map((key) => key.trim())
    .filter((key) => key.length > 0);
  const labels = keys.map((key, index) => {
    const words = outcomeWordsOf(condition, key === DEFAULT_OUTCOME_KEY ? null : key);
    const label = words?.label ?? outcomeLabel(key);
    return index === 0 || words?.label ? label : label.charAt(0).toLowerCase() + label.slice(1);
  });
  return labels.join(" or ");
}

/** The condition blueprint, narrowed, or `null`. */
export function asCondition(
  pipe: PipeBlueprintUnion | null | undefined,
): PipeConditionBlueprint | null {
  return pipe?.type === "PipeCondition" ? pipe : null;
}

// ─── Plumbing ────────────────────────────────────────────────────────────────

/** The natives whose values are files: an output reaching one of them is file-valued. */
const FILE_NATIVE_CODES: ReadonlySet<string> = new Set(["Image", "Document"]);

function isFileNativeRef(ref: string | null | undefined): boolean {
  if (!ref) return false;
  const [domain, code] = ref.includes(".") ? ref.split(".", 2) : ["native", ref];
  return domain === "native" && FILE_NATIVE_CODES.has(code ?? "");
}

/**
 * Whether a pipe's output is file-valued (MTHDS, "Naming Produced Files"): its
 * concept is `native.Image` or `native.Document`, or refines one of them,
 * single or plural. `true` or `false` when the output says so, `null` when it
 * cannot tell: a concept refining one of the method's own concepts, whose own
 * refinement only `lookupConcept` can follow.
 */
export function isFileValuedOutput(
  output: StuffSpecInfo | null | undefined,
  lookupConcept?: (conceptRef: string) => ConceptInfo | null | undefined,
): boolean | null {
  let concept: ConceptInfo | null | undefined = output?.concept;
  const seen = new Set<string>();
  while (concept) {
    if (concept.domain_code === "native") return FILE_NATIVE_CODES.has(concept.code);
    const refines = concept.refines;
    if (!refines) return false;
    if (isFileNativeRef(refines)) return true;
    if (refines.startsWith("native.") || !refines.includes(".")) return false;
    if (!lookupConcept || seen.has(refines)) return null;
    seen.add(refines);
    concept = lookupConcept(refines);
    if (!concept) return null;
  }
  return output ? false : null;
}

/**
 * Whether a step is plumbing, which a view of a run does not show (MTHDS,
 * "What a Run Shows"): it only moves data from one shape to another. A
 * PipeCompose always is, and a binding step; a PipeFunc is unless its output
 * is file-valued. A PipeFunc whose pipe is unknown, or whose output cannot be
 * told, is shown: a step a person waits for is never hidden on a guess. Every
 * other pipe type is a step or a group.
 */
export function isPlumbingStep(
  pipeType: string,
  pipe?: PipeBlueprintUnion | null,
  lookupConcept?: (conceptRef: string) => ConceptInfo | null | undefined,
): boolean {
  if (pipeType === "PipeCompose" || pipeType === BINDING_STEP_TYPE) return true;
  if (pipeType !== "PipeFunc") return false;
  if (!pipe) return false;
  return isFileValuedOutput(pipe.output, lookupConcept) === false;
}
