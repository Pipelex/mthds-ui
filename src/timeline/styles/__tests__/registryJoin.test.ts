import { describe, expect, it } from "vitest";
import type { PipeBatchBlueprint, PipeSequenceBlueprint } from "@graph/types";
import { DRY_SIMPLE_BATCH } from "@graph/react/viewer/__stories__/pipelines/specs/_generated/dry/pipeline_08";
import {
  REVIEW_FILINGS_REGISTRY,
  VET_COMPANY_REGISTRY,
} from "@timeline/react/__stories__/methodRegistries";
import { WORKED_EXAMPLE_SNAPSHOT } from "@timeline/react/__stories__/recordedRuns";
import { buildInvocationTree, type InvocationTreeNode } from "@timeline/invocationTree";
import {
  joinBatch,
  joinedSequence,
  pipeOf,
  qualifyPipeCode,
  sequenceOf,
  stepAt,
  stepNumberOf,
  stepsAfter,
  titleOf,
  type TimelinePipeRegistry,
} from "../registryJoin";

const RUN_GRAPH_REGISTRY: TimelinePipeRegistry = DRY_SIMPLE_BATCH.pipe_registry ?? {};

/** A registry without one of its pipes. */
function without(registry: TimelinePipeRegistry, pipeRef: string): TimelinePipeRegistry {
  return Object.fromEntries(Object.entries(registry).filter(([ref]) => ref !== pipeRef));
}

function vetCompany(): PipeSequenceBlueprint {
  const sequence = sequenceOf(VET_COMPANY_REGISTRY, "diligence.vet_company");
  if (!sequence) throw new Error("the vetting method has no vet_company sequence");
  return sequence;
}

/** The worked example's tree, and a node of it by path. */
function workedNode(path: string): InvocationTreeNode {
  const find = (nodes: InvocationTreeNode[]): InvocationTreeNode | undefined => {
    for (const node of nodes) {
      if (node.invocation.path === path) return node;
      const found = find(node.children);
      if (found) return found;
    }
    return undefined;
  };
  const node = find(buildInvocationTree(WORKED_EXAMPLE_SNAPSHOT));
  if (!node) throw new Error(`no node at ${path}`);
  return node;
}

describe("qualifyPipeCode", () => {
  it("qualifies a bare code with the domain and keeps a full ref", () => {
    expect(qualifyPipeCode("extract_filings", "filings")).toBe("filings.extract_filings");
    expect(qualifyPipeCode("other.extract", "filings")).toBe("other.extract");
    expect(qualifyPipeCode("extract", "")).toBe("extract");
  });
});

describe("pipeOf and sequenceOf", () => {
  it("find a pipe by its ref, and nothing without a registry or the pipe", () => {
    expect(pipeOf(REVIEW_FILINGS_REGISTRY, "filings.read_filing")?.description).toBe(
      "Read the filing",
    );
    expect(pipeOf(undefined, "filings.read_filing")).toBeNull();
    expect(pipeOf(REVIEW_FILINGS_REGISTRY, "filings.missing")).toBeNull();
    expect(pipeOf(REVIEW_FILINGS_REGISTRY, "constructor")).toBeNull();
  });

  it("find only a sequence as a sequence", () => {
    expect(sequenceOf(REVIEW_FILINGS_REGISTRY, "filings.review_filings")?.code).toBe(
      "review_filings",
    );
    expect(sequenceOf(REVIEW_FILINGS_REGISTRY, "filings.read_filing")).toBeNull();
  });
});

describe("step numbering", () => {
  it("counts a binding step and skips the binding of a dotted batch_over", () => {
    const sequence = vetCompany();
    expect(stepAt(sequence, 1)).toBeNull();
    expect(stepAt(sequence, 2)?.pipeRef).toBe("diligence.gather_sources");
    expect(stepAt(sequence, 3)?.pipeRef).toBe("diligence.compile_dossier");
    const batching = stepAt(sequence, 4);
    expect(batching?.pipeRef).toBe("diligence.verify_claim");
    expect(batching?.spec.batch_params?.input_item_stuff_name).toBe("claim");
    expect(stepAt(sequence, 6)?.pipeRef).toBe("diligence.write_memo");
    expect(stepAt(sequence, 7)).toBeNull();
  });

  it("lists the pipe steps after a step, binding steps left out", () => {
    const sequence = vetCompany();
    expect(stepsAfter(sequence, 0).map((step) => step.number)).toEqual([2, 3, 4, 5, 6]);
    expect(stepsAfter(sequence, 4).map((step) => step.pipeRef)).toEqual([
      "diligence.weigh_risks",
      "diligence.write_memo",
    ]);
    expect(stepsAfter(sequence, 6)).toEqual([]);
  });

  it("reads a run graph's full refs as they are", () => {
    const sequence = sequenceOf(RUN_GRAPH_REGISTRY, "document_batch.batch_ocr_pipeline");
    if (!sequence) throw new Error("no sequence in the run graph's registry");
    expect(stepAt(sequence, 2)?.pipeRef).toBe("document_batch.summarize_page");
  });

  it("reads a node's step number off its path", () => {
    expect(stepNumberOf(workedNode("filings.review_filings/step_3"))).toBe(3);
    expect(stepNumberOf(workedNode("filings.review_filings/step_3/item_2"))).toBeNull();
    expect(stepNumberOf(workedNode("filings.review_filings"))).toBeNull();
  });
});

describe("joinedSequence", () => {
  it("joins a sequence that agrees with what ran under it, a batching step included", () => {
    const root = workedNode("filings.review_filings");
    expect(joinedSequence(REVIEW_FILINGS_REGISTRY, root)?.code).toBe("review_filings");
  });

  it("refuses a sequence of another version, and a registry that lacks it", () => {
    const root = workedNode("filings.review_filings");
    const reordered = {
      ...REVIEW_FILINGS_REGISTRY,
      "filings.review_filings": {
        ...(REVIEW_FILINGS_REGISTRY["filings.review_filings"] as PipeSequenceBlueprint),
        sequential_sub_pipes: [{ pipe_code: "choose_depth" }, { pipe_code: "extract_filings" }],
      },
    } as TimelinePipeRegistry;
    expect(joinedSequence(reordered, root)).toBeNull();
    const shorter = {
      ...REVIEW_FILINGS_REGISTRY,
      "filings.review_filings": {
        ...(REVIEW_FILINGS_REGISTRY["filings.review_filings"] as PipeSequenceBlueprint),
        sequential_sub_pipes: [{ pipe_code: "extract_filings" }],
      },
    } as TimelinePipeRegistry;
    expect(joinedSequence(shorter, root)).toBeNull();
    expect(joinedSequence(undefined, root)).toBeNull();
    expect(joinedSequence({}, root)).toBeNull();
  });
});

describe("titleOf", () => {
  it("titles by the description, else by the humanized code", () => {
    expect(titleOf(REVIEW_FILINGS_REGISTRY, "filings.extract_filings", "extract_filings")).toEqual({
      title: "Extract the filings from the document",
      fromDescription: true,
    });
    expect(titleOf(undefined, "filings.extract_filings", "extract_filings")).toEqual({
      title: "Extract filings",
      fromDescription: false,
    });
  });
});

describe("joinBatch", () => {
  const batchNode = () => workedNode("filings.review_filings/step_3");
  const reviewFilings = () =>
    sequenceOf(REVIEW_FILINGS_REGISTRY, "filings.review_filings") as PipeSequenceBlueprint;

  it("names a batch after its branch and item, from the batch the registry holds", () => {
    expect(joinBatch(REVIEW_FILINGS_REGISTRY, batchNode(), null)).toEqual({
      branchRef: "filings.summarize_filing",
      title: { title: "Summarize a filing", fromDescription: true },
      itemName: "filing",
    });
  });

  it("falls back to the parent sequence's step when the registry lacks the batch", () => {
    const withoutBatch = without(REVIEW_FILINGS_REGISTRY, "filings.summarize_filing_batch");
    expect(joinBatch(withoutBatch, batchNode(), reviewFilings())).toEqual({
      branchRef: "filings.summarize_filing",
      title: { title: "Summarize a filing", fromDescription: true },
      itemName: "filing",
    });
  });

  it("falls back to the pipe its items run, then to the batch's own code, never its description", () => {
    expect(joinBatch(undefined, batchNode(), null)).toEqual({
      branchRef: "filings.summarize_filing",
      title: { title: "Summarize filing", fromDescription: false },
      itemName: null,
    });
    const unfanned: InvocationTreeNode = { ...batchNode(), children: [] };
    expect(joinBatch(undefined, unfanned, null)).toEqual({
      branchRef: null,
      title: { title: "Summarize filing batch", fromDescription: false },
      itemName: null,
    });
  });

  it("titles the branch by its humanized code when the registry lacks the branch", () => {
    const withoutBranch = without(REVIEW_FILINGS_REGISTRY, "filings.summarize_filing");
    expect(joinBatch(withoutBranch, batchNode(), null).title).toEqual({
      title: "Summarize filing",
      fromDescription: false,
    });
  });

  it("qualifies a run graph's batch branch and reads its item", () => {
    const batch = RUN_GRAPH_REGISTRY["document_batch.summarize_page_batch"] as PipeBatchBlueprint;
    expect(batch.description).toMatch(/^Batch processing for/);
    const node: InvocationTreeNode = {
      invocation: {
        path: "document_batch.batch_ocr_pipeline/step_2",
        pipe_code: "summarize_page_batch",
        pipe_ref: "document_batch.summarize_page_batch",
        pipe_type: "PipeBatch",
        status: "running",
        started_at: "2026-10-12T09:30:00Z",
        ended_at: null,
      },
      order: 1,
      segment: { kind: "step", ordinal: 2, raw: "step_2" },
      parentPath: "document_batch.batch_ocr_pipeline",
      children: [],
    };
    expect(joinBatch(RUN_GRAPH_REGISTRY, node, null)).toEqual({
      branchRef: "document_batch.summarize_page",
      title: { title: "Summarize a single page", fromDescription: true },
      itemName: "page",
    });
  });
});
