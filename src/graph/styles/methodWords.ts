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
import type { NodePipeType } from "@graph/types";
import { BINDING_STEP_TYPE, OUTCOME_TONE, isOutcomeTone } from "@graph/types";
import { makePipeRef, parsePipeRef } from "@graph/pipeRefs";
import {
  humanizeIdentifier,
  outcomeKeyLabel,
  sentenceCase,
  stripDomain,
  wordsInSentence,
} from "./humanize";
import { NATIVE_DOMAIN } from "./nativeConcepts";

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
 * One of a condition's outcomes: a key of its outcome map, or `null` for its
 * default outcome. The default is never spelled as a key, so an outcome the
 * method itself names `default` stays its own.
 */
export type OutcomeKey = string | null;

/**
 * The words a condition gives one of its outcomes: the outcome map's key, or
 * `null` for its default outcome. `null` when the condition is unknown or wrote
 * that outcome as a bare pipe reference, which carries no words.
 */
export function outcomeWordsOf(
  condition: PipeBlueprintUnion | null | undefined,
  key: OutcomeKey,
): OutcomeWordsRead | null {
  if (condition?.type !== "PipeCondition") return null;
  if (key === null) return readWords(condition.default_outcome_words);
  const words = condition.outcome_words;
  if (!words || !Object.hasOwn(words, key)) return null;
  return readWords(words[key]);
}

/**
 * The tone one outcome reads in, the one rule every view colours an outcome
 * by: the tone the method states; else neutral when the method gives the
 * outcome a label, since a named outcome is drawn as one; else none, and an
 * outcome named only by its key, or given only a description, keeps the
 * colour of what surrounds it. No tone is ever inferred.
 */
export function outcomeTone(
  words: Pick<OutcomeWordsRead, "label" | "tone"> | null | undefined,
): OutcomeTone | null {
  if (!words) return null;
  if (words.tone) return words.tone;
  return words.label !== null ? OUTCOME_TONE.NEUTRAL : null;
}

/**
 * The tone of one arrow or row standing for several outcomes: a tone only when
 * every outcome in it has one (`outcomeTone`) and they all agree, since one row
 * cannot say two things, and an outcome without words says nothing to agree
 * with.
 */
export function sharedOutcomeTone(
  words: readonly (Pick<OutcomeWordsRead, "label" | "tone"> | null)[],
): OutcomeTone | null {
  const tones = words.map(outcomeTone);
  if (tones.length === 0 || tones.some((tone) => tone === null)) return null;
  return new Set(tones).size === 1 ? tones[0] : null;
}

/**
 * The description and tone of a row or a line standing for a branch's
 * outcomes: a description only when exactly one of them has one, and a tone
 * by `sharedOutcomeTone`, which for a single outcome is its `outcomeTone`.
 */
export function branchOutcomeWords(
  condition: PipeBlueprintUnion | null | undefined,
  outcomes: readonly OutcomeKey[],
): { description: string | null; tone: OutcomeTone | null } {
  const read = outcomes.map((key) => outcomeWordsOf(condition, key));
  const descriptions = read.flatMap((words) => (words?.description ? [words.description] : []));
  return {
    description: descriptions.length === 1 ? descriptions[0] : null,
    tone: sharedOutcomeTone(read),
  };
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

/**
 * Which outcome a live run's condition took, from what its node's
 * `execution_data` records: the outcome map's key, `null` for the default
 * outcome, or `undefined` when it records none, as a dry run does. The runtime
 * records the value the expression rendered (`evaluated_expression`) and the
 * pipe the outcome map names for it (`selected_outcome`), the default
 * outcome's when the value is no key; the two must agree, so a dry run's
 * `all_outcomes` takes none. Without the rendered value, the key is the one
 * whose pipe was run, and the default when no key names it.
 */
export function takenOutcomeKey(
  condition: PipeConditionBlueprint,
  executionData: Record<string, unknown> | null | undefined,
): OutcomeKey | undefined {
  const selected = executionData?.selected_outcome;
  if (typeof selected !== "string") return undefined;
  const map = condition.outcome_map;
  const evaluated = executionData?.evaluated_expression;
  if (typeof evaluated === "string") {
    if (Object.hasOwn(map, evaluated)) return map[evaluated] === selected ? evaluated : undefined;
    return condition.default_outcome === selected ? null : undefined;
  }
  const key = Object.keys(map).find((each) => map[each] === selected);
  if (key !== undefined) return key;
  return condition.default_outcome === selected ? null : undefined;
}

/** How a static graph's outcome tag spells the default outcome (`no_fit | default`). */
const DEFAULT_OUTCOME_TAG = "default";

/**
 * The outcomes a static graph's outcome tag names, as `buildStaticGraphSpec`
 * writes one on a branch taken on several (`no_fit | default`), where
 * `default` names the default outcome. The tag cannot tell that from an
 * outcome the method names `default`, so it is read only where the condition's
 * own blueprint is unknown; with the blueprint, `conditionBranches` says.
 */
export function outcomeKeysFromTag(tag: string): OutcomeKey[] {
  return tag
    .split("|")
    .map((key) => key.trim())
    .filter((key) => key.length > 0)
    .map((key) => (key === DEFAULT_OUTCOME_TAG ? null : key));
}

/** Whether two lists name the same outcomes, in whatever order. */
export function sameOutcomes(a: readonly OutcomeKey[], b: readonly OutcomeKey[]): boolean {
  if (a.length !== b.length) return false;
  const keys = new Set(a);
  return keys.size === new Set(b).size && b.every((key) => keys.has(key));
}

/**
 * A branch's outcomes as one label, as an arrow or a row says them: each
 * outcome by its label when the condition gives it one, else in plain words
 * (`outcomeKeyLabel`; the default outcome reads "Otherwise"), joined by "or".
 * Plain words after the first go in lower case, unless they open with an
 * acronym, as `humanizeInSentence` keeps one ("Text or PDF").
 */
export function outcomeArrowLabel(
  outcomes: readonly OutcomeKey[],
  condition: PipeBlueprintUnion | null | undefined,
): string {
  const labels = outcomes.map((key, index) => {
    const words = outcomeWordsOf(condition, key);
    if (words?.label) return words.label;
    const label = key === null ? DEFAULT_OUTCOME_WORDS : outcomeKeyLabel(key);
    return index === 0 ? label : wordsInSentence(label);
  });
  return labels.join(" or ");
}

/** What the default outcome is called when the method does not name it. */
const DEFAULT_OUTCOME_WORDS = "Otherwise";

/** One way a condition can go: the outcomes that lead to one pipe, or to `fail` or `continue`. */
export interface ConditionBranch {
  /**
   * What the outcomes lead to: the pipe's full reference, or `fail` or
   * `continue`. Unique among a condition's branches, so it identifies one.
   */
  target: string;
  /** The outcomes taken to it, in the order the condition writes them, the default last. */
  outcomes: OutcomeKey[];
  /**
   * The branch as its arrow and its row say it (`outcomeArrowLabel`). When two
   * branches would read the same, case aside, each is followed by its outcome
   * keys as the method writes them, "otherwise" for the default ("Check
   * (high)", "Check (low)"), so two arrows never read alike.
   */
  label: string;
}

/**
 * Each way a condition can go, one branch per pipe its outcomes lead to, the
 * order the condition writes its outcomes in. A bare pipe reference takes the
 * condition's own domain.
 */
export function conditionBranches(condition: PipeConditionBlueprint): ConditionBranch[] {
  const fullRef = (pipeRef: string): string => {
    if (pipeRef === "fail" || pipeRef === "continue") return pipeRef;
    const parsed = parsePipeRef(pipeRef);
    return parsed
      ? makePipeRef(parsed.domainPath ?? condition.domain_code, parsed.pipeCode)
      : pipeRef;
  };
  const byTarget = new Map<string, OutcomeKey[]>();
  const named: [OutcomeKey, string | null | undefined][] = Object.entries(condition.outcome_map);
  named.push([null, condition.default_outcome]);
  for (const [key, pipeRef] of named) {
    if (!pipeRef) continue;
    const target = fullRef(pipeRef);
    const outcomes = byTarget.get(target);
    if (outcomes) outcomes.push(key);
    else byTarget.set(target, [key]);
  }
  const branches = [...byTarget.entries()].map(([target, outcomes]) => ({
    target,
    outcomes,
    label: outcomeArrowLabel(outcomes, condition),
  }));
  // Labels that differ only in case read alike too ("Approve or retry" beside
  // "Approve or Retry").
  const counts = new Map<string, number>();
  const spoken = (label: string) => label.toLowerCase();
  for (const { label } of branches) counts.set(spoken(label), (counts.get(spoken(label)) ?? 0) + 1);
  for (const branch of branches) {
    if ((counts.get(spoken(branch.label)) ?? 0) < 2) continue;
    const keys = branch.outcomes.map((key) => key ?? DEFAULT_OUTCOME_WORDS.toLowerCase());
    branch.label = `${branch.label} (${keys.join(", ")})`;
  }
  return branches;
}

// ─── Plumbing ────────────────────────────────────────────────────────────────

/** The natives whose values are files: an output reaching one of them is file-valued. */
const FILE_NATIVE_CODES: ReadonlySet<string> = new Set(["Image", "Document"]);

/** Looks a concept up by its full reference (`legal.Scan`), as a registry knows it. */
export type ConceptLookup = (conceptRef: string) => ConceptInfo | null | undefined;

/**
 * Whether a pipe's output is file-valued (MTHDS, "Naming Produced Files"): its
 * concept is `native.Image` or `native.Document`, or refines one of them,
 * directly or through the method's own concepts, single or plural. `true` or
 * `false` when the chain of refinements says so, `null` when it cannot be
 * followed: a refinement `lookupConcept` does not know, or a cycle.
 *
 * A refinement written bare (`refines = "Scan"`) names a concept in the
 * refining concept's own domain, which `lookupConcept` is asked for first; a
 * bare `Image` or `Document` the domain does not declare is the native. A
 * bare name that resolves to neither is unknown, never taken for a native
 * that writes no file.
 *
 * Each concept on the way is read at its fullest: when `lookupConcept` knows
 * it with a refinement the concept at hand lacks, the lookup's entry is
 * followed. A concept that states no refinement (`refines: null`) reaches no
 * file; one that arrives without the field at all, and that the lookup cannot
 * complete, is unknown.
 */
export function isFileValuedOutput(
  output: StuffSpecInfo | null | undefined,
  lookupConcept?: ConceptLookup,
): boolean | null {
  let concept: ConceptInfo | null | undefined = output?.concept;
  if (!concept) return null;
  const seen = new Set<string>();
  while (concept) {
    if (concept.domain_code === NATIVE_DOMAIN) return FILE_NATIVE_CODES.has(concept.code);
    concept = fullerConcept(concept, lookupConcept?.(`${concept.domain_code}.${concept.code}`));
    const refines: string | null | undefined = concept.refines;
    if (refines === undefined) return null;
    if (!refines) return false;
    const qualified: boolean = refines.includes(".");
    if (qualified && refines.slice(0, refines.lastIndexOf(".")) === NATIVE_DOMAIN) {
      return FILE_NATIVE_CODES.has(stripDomain(refines));
    }
    const ref: string = qualified ? refines : `${concept.domain_code}.${refines}`;
    if (seen.has(ref)) return null;
    seen.add(ref);
    const found: ConceptInfo | null | undefined = lookupConcept?.(ref);
    if (found) {
      concept = found;
      continue;
    }
    if (qualified) return null;
    return FILE_NATIVE_CODES.has(refines) ? true : null;
  }
  return null;
}

/**
 * How much a concept entry says of its refinement: a refinement it names, a
 * `refines: null` stating it names none, or nothing, the field left out.
 */
function refinementWeight(concept: ConceptInfo): number {
  if (typeof concept.refines === "string" && concept.refines !== "") return 2;
  return concept.refines === undefined ? 0 : 1;
}

/** Of two entries for one concept, the one that says more of its refinement, `current` on a tie. */
function fullerConcept(current: ConceptInfo, other: ConceptInfo | null | undefined): ConceptInfo {
  return other && refinementWeight(other) > refinementWeight(current) ? other : current;
}

/**
 * What a view of a run does with a step, by its pipe type (MTHDS, "What a Run
 * Shows"): shows it, leaves it out as plumbing, or leaves it out only when its
 * output is not a file. Keyed by `NodePipeType`, so a new pipe type does not
 * compile until it is placed here.
 */
const RUN_VIEW_ROLE: Record<NodePipeType, "step" | "plumbing" | "plumbing-unless-file"> = {
  PipeLLM: "step",
  PipeExtract: "step",
  PipeCompose: "plumbing",
  PipeImgGen: "step",
  PipeSearch: "step",
  PipeFunc: "plumbing-unless-file",
  PipeStructure: "step",
  PipeJudge: "step",
  PipeDocGen: "step",
  PipeSignature: "step",
  PipeSequence: "step",
  PipeParallel: "step",
  PipeCondition: "step",
  PipeBatch: "step",
  [BINDING_STEP_TYPE]: "plumbing",
};

/**
 * Whether a step is plumbing, which a view of a run does not show (MTHDS,
 * "What a Run Shows"): it only moves data from one shape to another. A
 * PipeCompose always is, and a binding step; a PipeFunc is unless its output
 * is file-valued (`isFileValuedOutput`, through `lookupConcept`). A PipeFunc
 * whose pipe is unknown, or whose output cannot be told, is shown: a step a
 * person waits for is never hidden on a guess. Every other pipe type, and a
 * type this package does not know, is a step or a group. `pipeType` is a
 * string because a run's snapshot carries it unvalidated.
 */
export function isPlumbingStep(
  pipeType: string,
  pipe?: PipeBlueprintUnion | null,
  lookupConcept?: ConceptLookup,
): boolean {
  if (!Object.hasOwn(RUN_VIEW_ROLE, pipeType)) return false;
  const role = RUN_VIEW_ROLE[pipeType as NodePipeType];
  if (role !== "plumbing-unless-file") return role === "plumbing";
  if (!pipe) return false;
  return isFileValuedOutput(pipe.output, lookupConcept) === false;
}

/**
 * A concept lookup over what a pipe registry declares: every concept a pipe
 * of it reads or writes, by its full reference, and the concepts of a concept
 * registry beside it when there is one. Built once per registry. A concept
 * met several times keeps the entry that says most of its refinement, so a
 * poorer copy read later, one serialised without its `refines` or a stub for
 * a concept a pipe only names, never replaces a fuller one.
 */
export function registryConceptLookup(
  pipes: Readonly<Record<string, PipeBlueprintUnion>> | undefined,
  concepts?: Readonly<Record<string, ConceptInfo>> | null,
): ConceptLookup {
  const known = new Map<string, ConceptInfo>();
  const add = (concept: ConceptInfo | null | undefined) => {
    if (concept?.domain_code && concept.code) {
      const ref = `${concept.domain_code}.${concept.code}`;
      const held = known.get(ref);
      known.set(ref, held ? fullerConcept(held, concept) : concept);
    }
  };
  for (const pipe of Object.values(pipes ?? {})) {
    add(pipe.output?.concept);
    for (const input of Object.values(pipe.inputs ?? {})) add(input?.concept);
  }
  for (const concept of Object.values(concepts ?? {})) add(concept);
  return (conceptRef) => known.get(conceptRef);
}
