// ─── Parity harness: static builder vs pipelex dry-run GraphSpecs ────────────
// The permanent Python↔TS drift detector (wip/static-graph-design.md, "Parity
// harness"): both specs are normalized to a canonical *structural* form, and
// the comparison runs over exactly what the renderer consumes — the node
// multiset, the containment tree, and the producer/consumer relation per stuff
// (derived with the renderer's own `buildDataflowAnalysis`, so "producer"
// means what it means on screen: operators only, never controllers).
//
// Normalization rules (documented here, mirrored in the design doc):
//
// 1. **Batch fan-out collapse (dry side).** A dry run expands a PipeBatch into
//    one child per mock list item. All children of a PipeBatch node are
//    instances of the same branch pipe, so every child subtree after the first
//    is dropped, along with the edges and stuff that only those subtrees
//    reference. The static side already emits one representative branch.
// 2. **Id normalization.** Node ids (run-scoped `<uuid>:node_N` vs static
//    invocation paths) are replaced by canonical paths derived from the
//    containment tree: the root is its `pipe_code`, each child appends
//    `/<pipe_code>`, and same-code siblings get a `#k` occurrence suffix in
//    sibling (emission) order. Two specs describe the same method iff these
//    paths line up.
// 3. **Runtime-field stripping (implicit).** The canonical form only reads
//    structural fields — `kind`, `pipe_code`, `pipe_type`, `domain_code`,
//    `contains` edges, and io `name`/`digest`/`concept`. `timing`, `metrics`,
//    `execution_data`, previews and data payloads never enter the comparison.
// 4. **Elaboration collapse — not implemented.** No fixture bundle uses
//    `structuring_method = "preliminary_text"`, so the dry corpus contains no
//    `<code>__draft_text` + synthetic PipeStructure expansion to collapse. If
//    a future fixture introduces one, parity will fail with extra dry-side
//    nodes and this rule needs implementing.
//
// Stuff identity: digests are not comparable across sides (random dry strings
// vs deterministic static strings), so a stuff is identified by its *relation
// signature* — producer path (or `-` for producer-less stuff: external
// inputs, batch items/aggregates, condition alias stuff), name, concept, and
// the sorted consumer paths. Signatures are compared as multisets.

import { buildDataflowAnalysis } from "@graph/graphAnalysis";
import type { GraphSpec } from "@graph/types";

// ─── Batch fan-out collapse ──────────────────────────────────────────────────

function containsChildren(spec: GraphSpec): Map<string, string[]> {
  const children = new Map<string, string[]>();
  for (const edge of spec.edges) {
    if (edge.kind !== "contains") continue;
    const list = children.get(edge.source);
    if (list === undefined) children.set(edge.source, [edge.target]);
    else list.push(edge.target);
  }
  return children;
}

/** Drop every PipeBatch child subtree after the first (dry-run fan-out → one branch). */
export function collapseBatchFanOut(spec: GraphSpec): GraphSpec {
  const children = containsChildren(spec);
  const dropped = new Set<string>();
  const markSubtree = (id: string): void => {
    if (dropped.has(id)) return;
    dropped.add(id);
    for (const child of children.get(id) ?? []) markSubtree(child);
  };
  for (const node of spec.nodes) {
    if (node.pipe_type !== "PipeBatch") continue;
    for (const extra of (children.get(node.id) ?? []).slice(1)) markSubtree(extra);
  }
  if (dropped.size === 0) return spec;
  return {
    ...spec,
    nodes: spec.nodes.filter((node) => !dropped.has(node.id)),
    edges: spec.edges.filter((edge) => !dropped.has(edge.source) && !dropped.has(edge.target)),
  };
}

// ─── Canonicalization ────────────────────────────────────────────────────────

export interface CanonicalGraph {
  /** One signature line per node: path + structural fields. */
  nodeSignatures: string[];
  /** One signature line per stuff: producer path, name, concept, consumer paths. */
  stuffSignatures: string[];
}

/** Map every node id to its canonical containment path. */
function canonicalPaths(spec: GraphSpec): Map<string, string> {
  const byId = new Map(spec.nodes.map((node) => [node.id, node]));
  const children = containsChildren(spec);
  const hasParent = new Set<string>();
  for (const list of children.values()) for (const id of list) hasParent.add(id);

  const pathOf = new Map<string, string>();
  const assign = (ids: string[], parentPath: string | null): void => {
    const codeCounts = new Map<string, number>();
    for (const id of ids) {
      const code = byId.get(id)?.pipe_code ?? id;
      codeCounts.set(code, (codeCounts.get(code) ?? 0) + 1);
    }
    const seen = new Map<string, number>();
    for (const id of ids) {
      const node = byId.get(id);
      if (node === undefined) continue;
      const code = node.pipe_code ?? id;
      const occurrence = (seen.get(code) ?? 0) + 1;
      seen.set(code, occurrence);
      const segment = (codeCounts.get(code) ?? 0) > 1 ? `${code}#${occurrence}` : code;
      const path = parentPath === null ? segment : `${parentPath}/${segment}`;
      pathOf.set(id, path);
      assign(children.get(id) ?? [], path);
    }
  };
  assign(
    spec.nodes.filter((node) => !hasParent.has(node.id)).map((node) => node.id),
    null,
  );
  return pathOf;
}

export function canonicalizeGraph(spec: GraphSpec): CanonicalGraph {
  const pathOf = canonicalPaths(spec);
  const nodeSignatures = spec.nodes
    .map(
      (node) =>
        `node ${pathOf.get(node.id)} :: kind=${node.kind} type=${node.pipe_type} ` +
        `domain=${node.domain_code}`,
    )
    .sort();

  // buildDataflowAnalysis never returns null for a non-null spec.
  const analysis = buildDataflowAnalysis(spec) as NonNullable<
    ReturnType<typeof buildDataflowAnalysis>
  >;
  const stuffSignatures = Object.entries(analysis.stuffRegistry)
    .map(([digest, info]) => {
      const producerId = analysis.stuffProducers[digest];
      const producer = producerId === undefined ? "-" : (pathOf.get(producerId) ?? producerId);
      const consumers = [
        ...new Set((analysis.stuffConsumers[digest] ?? []).map((id) => pathOf.get(id) ?? id)),
      ].sort();
      return (
        `stuff producer=${producer} name=${info.name} concept=${info.concept ?? "-"} ` +
        `consumers=[${consumers.join(", ")}]`
      );
    })
    .sort();

  return { nodeSignatures, stuffSignatures };
}

// ─── Comparison ──────────────────────────────────────────────────────────────

/** Multiset difference rendered as human-readable divergence lines. */
function diffSignatures(label: string, staticSide: string[], drySide: string[]): string[] {
  const counts = new Map<string, number>();
  for (const sig of staticSide) counts.set(sig, (counts.get(sig) ?? 0) + 1);
  for (const sig of drySide) counts.set(sig, (counts.get(sig) ?? 0) - 1);
  const divergences: string[] = [];
  for (const [sig, count] of counts) {
    if (count > 0) divergences.push(`${label} only in static (×${count}): ${sig}`);
    if (count < 0) divergences.push(`${label} only in dry (×${-count}): ${sig}`);
  }
  return divergences.sort();
}

/**
 * Rule: a dry-side `concept=Anything` is a wildcard. The runtime loses the
 * concept for some stuff it assembles itself (batch aggregates are typed
 * `Anything` in dry graphs); the static side keeps the declared concept —
 * strictly richer, so a pair differing only that way is not a divergence.
 */
function dropAnythingWildcardPairs(divergences: string[]): string[] {
  const remaining = new Set(divergences);
  for (const dry of divergences) {
    if (!dry.includes("only in dry") || !dry.includes("concept=Anything")) continue;
    const match = divergences.find(
      (candidate) =>
        remaining.has(candidate) &&
        candidate.includes("only in static") &&
        candidate
          .replace("only in static", "only in dry")
          .replace(/concept=\S+/, "concept=Anything") === dry,
    );
    if (match !== undefined && remaining.has(dry)) {
      remaining.delete(dry);
      remaining.delete(match);
    }
  }
  return [...remaining];
}

/**
 * Compare a static-built GraphSpec against its dry-run counterpart. Returns
 * human-readable divergence lines; an empty array means structural parity.
 */
export function compareParity(staticSpec: GraphSpec, drySpec: GraphSpec): string[] {
  const staticCanon = canonicalizeGraph(staticSpec);
  const dryCanon = canonicalizeGraph(collapseBatchFanOut(drySpec));
  return [
    ...diffSignatures("node", staticCanon.nodeSignatures, dryCanon.nodeSignatures),
    ...dropAnythingWildcardPairs(
      diffSignatures("stuff", staticCanon.stuffSignatures, dryCanon.stuffSignatures),
    ),
  ];
}
