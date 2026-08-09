# Static Graphs

Static graphs render a MTHDS method from authored `.mthds` TOML without running
Pipelex. They are deterministic, best-effort, and intended for method-preview
surfaces such as editors, build tools, hub pages, and Storybook fixtures.

## API

```ts
import { buildStaticGraphSpecFromToml } from "@pipelex/mthds-ui/static-graph";

const { spec, diagnostics } = buildStaticGraphSpecFromToml(tomlText);
```

`spec` is a normal `GraphSpec` and can be passed straight to `GraphViewer`.
`diagnostics` contains non-fatal parse, merge, and walk notes. The static path is
best-effort: malformed or incomplete bundles should still produce whatever graph
can be inferred.

## Mode Contract

GraphSpec metadata now has an explicit mode:

```ts
meta: {
  format: "mthds";
  mode?: "dry" | "live" | "static";
}
```

Static behavior is enabled only by `meta.mode === "static"`. A missing mode is a
legacy runtime graph, not a static graph.

`validateGraphSpec` accepts `mode: "static"`, `"dry"`, `"live"`, and legacy
missing `mode`. Unknown modes are rejected.

## Static vs Dry vs Live

| Mode     | Source                                         | Purpose                                | Runtime chrome |
| -------- | ---------------------------------------------- | -------------------------------------- | -------------- |
| `static` | Authored `.mthds` TOML via `src/static-graph/` | Method structure preview               | Hidden         |
| `dry`    | Pipelex dry-run trace                          | Executability and mocked run structure | Shown          |
| `live`   | Pipelex live trace                             | Actual run state and data              | Shown          |

Static cards do not show status dots, pulse animation, or status titles.
Static pipe details hide status, duration, metrics, and execution-data dumps.
They keep authored blueprint sections, IO, concept links, descriptions, static
tags, and errors/diagnostics when present.

Dry pipe details keep run status and timing chrome, but hide generated mock
payloads, metrics, and rendered execution-data values. Dry stuff-node details
show concept structure only, not the generated data created by the fixture run.

`statusMap` overlays are ignored for static cards. Live-status overlay onto a
static graph needs a separate identity-mapping design because repeated
invocations can share a `pipe_code`.

## Native Concepts

`src/static-graph/conceptRefs.ts` carries a hand-kept catalog of the MTHDS native concept codes and their descriptions. Its authority is the standard's pinned set — `docs/spec/native-concepts.md` in the sibling `mthds/` repo — which pipelex mirrors in `pipelex/core/concepts/native/concept_native.py` (`NativeConceptCode`) and `native/pinned_blueprints.py` (the descriptions). Copy the code list and the wording from there, in the spec's canonical order; if the mirror and the spec page ever disagree, the spec page wins.

The catalog is what makes a native ref resolve as native: it decides whether a bare `YesNo` resolves into the `native` domain (description, `YesNoContent` structure class) or falls through to the authoring domain, and whether `refines = "YesNo"` qualifies to `native.YesNo`. A code the catalog does not know does not throw — it degrades into a stub with the wrong domain, an empty description, and a synthetic `<domain>__<Code>` structure class name.

Nothing this repo diffs enumerates the codes (the bundled `data/schema/mthds_schema.json` does not list them), so a native added upstream does not announce itself. Two tests cover this from opposite directions:

- `src/static-graph/__tests__/nativeConcepts.test.ts` pins the expected code list and its canonical order, which makes any edit to the catalog a deliberate two-place change. Both lists live here, so it cannot see an upstream change on its own — it holds the ordering, and the codes the corpus does not reach.
- `src/static-graph/__tests__/nativeConceptsCorpus.test.ts` compares the catalog against an oracle this repo did not author. Every `data/pipelines/*/dry_run_graph_spec.json` is pipelex output, so each `concept_registry` entry with `domain_code === "native"` carries pipelex's own code, description, and structure class name. **A native code pipelex emits that our catalog lacks fails this test**, as does a reworded description or a renamed structure class — so an upstream change becomes a failure here the moment someone runs `make fixtures`. The set of codes the corpus reaches is written out explicitly, so deleting a fixture fails the test rather than silently emptying it.

Coverage is every catalog code except **`Dynamic`**, which has no authorable output position and therefore cannot appear in a corpus bundle. `Dynamic` remains covered only by the pinned-list test.

That test fails in a confusing place — regenerating pipeline fixtures breaks a native-concepts unit test — so it carries a failure guide at the top of the file pointing at the catalog. Fix `conceptRefs.ts`, not the test.

Making the drift visible _before_ it reaches a consumer still needs tooling outside this repo; the brief is `pipelex/wip/native-concept-codes-drift-invisible.md`.

The catalog does not carry the natives' pinned _structures_: `ConceptInfo.json_schema` is optional and `nativeConceptInfo` has never populated it for any native, so a native's concept panel reads "Schema not available" where a pipelex-produced dry or live spec shows a field table.

## Authored Annotations

Static condition children show an outcome badge from `node.tags.outcome`. This
keeps the route label attached to the child card and survives layout changes and
folded controller cards.

Static batch graphs show a multiplicity badge on the representative branch in
expanded mode, and on the folded batch card when the controller is folded:

- `xN` for exact declared list multiplicity such as `Text[3]`
- `xmany` for unbounded list multiplicity such as `Text[]`
- `x?` when the list multiplicity cannot be inferred

Producer-less `parallel_combine` targets are classified as combined stuff rather
than external inputs. This applies to both dry and static graphs.

## Fixture Catalog

Storybook and tests expose `STATIC_*` specs and `STATIC_RUN_CATALOG` from
`src/graph/react/viewer/__stories__/staticGraphSpec.ts`. The catalog is built
from checked-in raw `.mthds` fixture bundles through the TypeScript static
builder. It does not require the Pipelex CLI, Python, a gateway key, or network
access.

Representative static-vs-live stories live in:

- `StaticGraphDev.stories.tsx`
- `StaticVsLive.stories.tsx`
- `StaticGraphInvalid.stories.tsx`

Three bundles exist specifically to give the native concepts fixture coverage, so
that the sweeps which auto-discover `data/pipelines/pipeline_*` (parse, build,
parity, and the corpus oracle above) actually see them:

| Directory     | Catalog entry          | What it covers                                                                                                                              |
| ------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `pipeline_32` | `MEETING_TRIAGE`       | `Date[]`, `Time`, and a bare `YesNo` as stuff nodes, plus a local concept refining a native — the four resolution paths, in one graph.      |
| `pipeline_33` | `AVAILABILITY_ROUTING` | The natives through the controllers: `batch_over` a native `Date[]`, and a `PipeCondition` on a native's structure field (`urgent.yes_no`). |
| `pipeline_34` | `ALL_NATIVE_CONCEPTS`  | One `PipeLLM` per remaining native output — `Number`, `Html`, `TextAndImages`, `JSON` — to lift the corpus oracle's coverage.               |

`pipeline_32` and `pipeline_33` carry **placeholder** LIVE fixtures (the DRY spec
re-tagged). pipelex cannot run them live: a `PipeLLM` outputting `Date`, `Date[]`,
or `Time` fails validation because structured output delivers a date as a JSON
string. See `pipelex/wip/native-date-time-live-run.md`; `make fixtures-live
ONLY=pipeline_32` is the regression check once that is fixed.

## Limitations

- Static graphs are not execution proof. Validation and dry runs still own
  executability.
- Runtime data, rendered prompts, timings, metrics, and live statuses are absent.
- Batch graphs render one representative branch, not sampled fan-out.
- The builder renders methods as authored; it does not mirror runtime
  elaboration rewrites such as possible preliminary-text expansion.
- Dependency refs without bundled source render as opaque `PipeSignature` leaves.
