/**
 * The join between a progress snapshot and the method's pipe registry.
 *
 * The snapshot says what ran; the registry says what the method declares: each
 * pipe's description, each sequence's steps in order and each batch's branch
 * and item name. They meet on `pipe_ref`, which an invocation and a registry key
 * share, and on step numbers, which a sequence's step path carries and which
 * are counted here as the progress contract counts them. Anything the registry
 * lacks falls back per line, never for the whole run.
 */
import type {
  PipeBatchBlueprint,
  PipeBlueprintUnion,
  PipeSequenceBlueprint,
  SequenceStepSpec,
  SubPipeSpec,
} from "@graph/types";
import { isBindingStepSpec } from "@graph/types";
import { humanizeInSentence, pipeTitle } from "@graph/styles/humanize";
import { PATH_SEGMENT_KIND, isOrdinalSegment } from "../invocationPath";
import type { InvocationTreeNode } from "../invocationTree";

/**
 * A method's pipes keyed by `pipe_ref`: the map a `GraphSpec` carries as
 * `pipe_registry` and the static builder emits. It must be the registry of the
 * version of the method that ran, since an invocation path is stable only
 * within one version.
 */
export type TimelinePipeRegistry = Readonly<Record<string, PipeBlueprintUnion>>;

/** A line's title in plain words, and whether it is the author's description. */
export interface JoinedTitle {
  title: string;
  fromDescription: boolean;
}

/** A pipe step of a sequence, with the number the contract gives it. */
export interface NumberedStep {
  /** Counted from 1, as the progress contract counts a step. */
  number: number;
  spec: SubPipeSpec;
  /** The step pipe's `pipe_ref`: its code qualified with the sequence's domain when bare. */
  pipeRef: string;
}

/**
 * A pipe code as a `pipe_ref`. A run graph's registry writes a step's or a
 * branch's `pipe_code` as a full ref (`filings.summarize_filing`); the static
 * builder writes the bare code (`summarize_filing`), which belongs to the
 * domain of the pipe that names it.
 */
export function qualifyPipeCode(pipeCode: string, domainCode: string): string {
  return pipeCode.includes(".") || domainCode === "" ? pipeCode : `${domainCode}.${pipeCode}`;
}

/** The registry's pipe for a `pipe_ref`, or `null` when there is no registry or it lacks the pipe. */
export function pipeOf(
  registry: TimelinePipeRegistry | undefined,
  pipeRef: string,
): PipeBlueprintUnion | null {
  if (!registry || !Object.hasOwn(registry, pipeRef)) return null;
  return registry[pipeRef] ?? null;
}

/** The registry's sequence for a `pipe_ref`, or `null` when it holds none by that ref. */
export function sequenceOf(
  registry: TimelinePipeRegistry | undefined,
  pipeRef: string,
): PipeSequenceBlueprint | null {
  const pipe = pipeOf(registry, pipeRef);
  return pipe?.type === "PipeSequence" && Array.isArray(pipe.sequential_sub_pipes) ? pipe : null;
}

/** The registry's batch for a `pipe_ref`, or `null` when it holds none by that ref. */
function batchOf(
  registry: TimelinePipeRegistry | undefined,
  pipeRef: string,
): PipeBatchBlueprint | null {
  const pipe = pipeOf(registry, pipeRef);
  return pipe?.type === "PipeBatch" ? pipe : null;
}

/**
 * Whether a step spec takes a number. Every step its author wrote does, a
 * binding step included; the binding the runtime writes for a dotted
 * `batch_over` (`is_dotted_batch_over`) is no step of the author's and takes
 * none, so the batching step it was written for keeps its own.
 */
function takesNumber(spec: SequenceStepSpec): boolean {
  return !(isBindingStepSpec(spec) && spec.is_dotted_batch_over === true);
}

/**
 * Every step of a sequence with the number the contract gives it, the binding
 * steps included, as `{ number, spec }`.
 */
function numberedSpecs(
  sequence: PipeSequenceBlueprint,
): { number: number; spec: SequenceStepSpec }[] {
  const numbered: { number: number; spec: SequenceStepSpec }[] = [];
  let number = 0;
  for (const spec of sequence.sequential_sub_pipes) {
    if (!takesNumber(spec)) continue;
    number += 1;
    numbered.push({ number, spec });
  }
  return numbered;
}

function asNumberedStep(
  sequence: PipeSequenceBlueprint,
  entry: { number: number; spec: SequenceStepSpec },
): NumberedStep | null {
  if (isBindingStepSpec(entry.spec)) return null;
  return {
    number: entry.number,
    spec: entry.spec,
    pipeRef: qualifyPipeCode(entry.spec.pipe_code, sequence.domain_code),
  };
}

/**
 * The pipe step a sequence runs at a step number, or `null` when that number
 * is a binding step, which runs no pipe, or is past the sequence's steps.
 */
export function stepAt(sequence: PipeSequenceBlueprint, number: number): NumberedStep | null {
  return stepIn(sequence, numberedSpecs(sequence), number);
}

/** `stepAt` over a sequence's steps already numbered: the numbers run from 1 without a gap, so a number is an index. */
function stepIn(
  sequence: PipeSequenceBlueprint,
  numbered: { number: number; spec: SequenceStepSpec }[],
  number: number,
): NumberedStep | null {
  const entry = Number.isInteger(number) && number >= 1 ? numbered[number - 1] : undefined;
  return entry ? asNumberedStep(sequence, entry) : null;
}

/**
 * The pipe steps of a sequence numbered above `reached`, in order: the steps a
 * running sequence has not reached yet, when `reached` is the highest step
 * number the snapshot holds under it. Binding steps are left out: they run no
 * pipe, so no line stands for them.
 */
export function stepsAfter(sequence: PipeSequenceBlueprint, reached: number): NumberedStep[] {
  return numberedSpecs(sequence)
    .filter((each) => each.number > reached)
    .map((each) => asNumberedStep(sequence, each))
    .filter((each): each is NumberedStep => each !== null);
}

/** The step number a node stands at under its parent sequence, or `null` when its path's last segment is no step. */
export function stepNumberOf(node: InvocationTreeNode): number | null {
  return node.segment?.kind === PATH_SEGMENT_KIND.STEP && isOrdinalSegment(node.segment)
    ? node.segment.ordinal
    : null;
}

/**
 * Whether a registry sequence agrees with what the snapshot ran under it: each
 * step the snapshot holds runs the pipe the sequence declares at that number,
 * or, at a batching step, a batch. A registry of another version of the method
 * fails this, and then nothing is read from it for that sequence.
 */
export function sequenceMatches(
  sequence: PipeSequenceBlueprint,
  node: InvocationTreeNode,
): boolean {
  const numbered = numberedSpecs(sequence);
  for (const child of node.children) {
    const number = stepNumberOf(child);
    if (number === null) continue;
    const step = stepIn(sequence, numbered, number);
    if (!step) return false;
    const invocation = child.invocation;
    if (step.spec.batch_params) {
      if (invocation.pipe_type !== "PipeBatch" && invocation.pipe_ref !== step.pipeRef)
        return false;
    } else if (invocation.pipe_ref !== step.pipeRef) {
      return false;
    }
  }
  return true;
}

/** The registry's sequence for a sequence invocation, when it agrees with what the snapshot ran under it. */
export function joinedSequence(
  registry: TimelinePipeRegistry | undefined,
  node: InvocationTreeNode,
): PipeSequenceBlueprint | null {
  const sequence = sequenceOf(registry, node.invocation.pipe_ref);
  return sequence && sequenceMatches(sequence, node) ? sequence : null;
}

/**
 * A pipe's title by its `pipe_ref`: its description as a title, else its
 * humanized code, `pipeCode` when given and otherwise the ref's last segment.
 */
export function titleOf(
  registry: TimelinePipeRegistry | undefined,
  pipeRef: string,
  pipeCode: string = pipeRef,
): JoinedTitle {
  return pipeTitle(pipeOf(registry, pipeRef)?.description, pipeCode);
}

/** What a batch's one line is named after: the pipe its items run, and the name of an item. */
export interface JoinedBatch {
  /** The branch pipe's `pipe_ref`, or `null` when neither the registry nor the snapshot names it. */
  branchRef: string | null;
  /** The line's title: the branch's description, never the batch's own. */
  title: JoinedTitle;
  /** The item's name in a sentence (`filing`), or `null` when the registry does not name it. */
  itemName: string | null;
}

/**
 * The branch and item of a batch invocation. Its branch is the batch
 * blueprint's `branch_pipe_code` when the registry holds the batch; else the
 * step spec of the sequence the batch stands in at its step number, which names
 * the batched pipe and its item; else the `pipe_ref` its items run. Its title is
 * the branch's, never the batch's own description, which a batch the runtime
 * makes for a batching step words technically ("Batch processing for …").
 * With nothing to name the branch, the batch's own code is humanized.
 */
export function joinBatch(
  registry: TimelinePipeRegistry | undefined,
  node: InvocationTreeNode,
  parentSequence: PipeSequenceBlueprint | null,
): JoinedBatch {
  const invocation = node.invocation;
  let branchRef: string | null = null;
  let itemName: string | null = null;
  const batch = batchOf(registry, invocation.pipe_ref);
  if (batch) {
    branchRef = qualifyPipeCode(batch.branch_pipe_code, batch.domain_code);
    itemName = batch.batch_params?.input_item_stuff_name || null;
  }
  const number = stepNumberOf(node);
  const step = parentSequence && number !== null ? stepAt(parentSequence, number) : null;
  if (step?.spec.batch_params) {
    branchRef ??= step.pipeRef;
    itemName ??= step.spec.batch_params.input_item_stuff_name || null;
  }
  if (branchRef === null) {
    const item = node.children.find((child) => child.segment?.kind === PATH_SEGMENT_KIND.ITEM);
    branchRef = item?.invocation.pipe_ref ?? null;
  }
  const title = branchRef ? titleOf(registry, branchRef) : pipeTitle(null, invocation.pipe_code);
  return { branchRef, title, itemName: itemName ? humanizeInSentence(itemName) : null };
}
