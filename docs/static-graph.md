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
- `src/static-graph/__tests__/nativeConceptsCorpus.test.ts` compares the catalog against an oracle this repo did not author. Every `data/pipelines/*/dry_run_graph_spec.json` is pipelex output, so each `concept_registry` entry with `domain_code === "native"` carries pipelex's own code, description, and structure class name. **A native code pipelex emits into the corpus that our catalog lacks fails this test**, as does a reworded description or a renamed structure class. The set of codes the corpus reaches is written out explicitly, so deleting a fixture fails the test rather than silently emptying it.

Read that scope precisely. A dry spec's `concept_registry` holds the concepts that spec **references**, not every native pipelex knows — `pipeline_01` contributes only `Text`. So the oracle catches a change to a native some bundle actually uses, on the next `make fixtures`. A brand-new native that no bundle references is still invisible, and stays a job for tooling outside this repo (`pipelex/wip/native-concept-codes-drift-invisible.md`). Adding a bundle that uses a native is what brings it in scope — which is what `pipeline_32`/`33`/`34` do.

Coverage is every catalog code except **`Dynamic`**, which has no authorable output position and therefore cannot appear in a corpus bundle. `Dynamic` remains covered only by the pinned-list test.

That test fails in a confusing place — regenerating pipeline fixtures breaks a native-concepts unit test — so it carries a failure guide at the top of the file pointing at the catalog. Fix `conceptRefs.ts`, not the test.

Catching the drift _before_ it reaches a consumer — and for natives no bundle references — still needs tooling outside this repo; the brief is `pipelex/wip/native-concept-codes-drift-invisible.md`.

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

Three bundles exist specifically to give the native concepts fixture coverage, so that the sweeps which auto-discover `data/pipelines/pipeline_*` (parse, build, parity, and the corpus oracle above) actually see them:

| Directory     | Catalog entry          | What it covers                                                                                                                              |
| ------------- | ---------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `pipeline_32` | `MEETING_TRIAGE`       | `Date[]`, `Time`, and a bare `YesNo` as stuff nodes, plus a local concept refining a native — the four resolution paths, in one graph.      |
| `pipeline_33` | `AVAILABILITY_ROUTING` | The natives through the controllers: `batch_over` a native `Date[]`, and a `PipeCondition` on a native's structure field (`urgent.yes_no`). |
| `pipeline_34` | `ALL_NATIVE_CONCEPTS`  | One `PipeLLM` per remaining native output — `Number`, `Html`, `TextAndImages`, `JSON` — to lift the corpus oracle's coverage.               |

`pipeline_32` and `pipeline_33` carry real LIVE fixtures. They briefly could not: a `PipeLLM` outputting `Date`, `Date[]`, or `Time` failed validation because structured output delivers a date as a JSON string, so both shipped a placeholder LIVE spec (the DRY spec re-tagged). Fixed upstream in [pipelex#1089](https://github.com/Pipelex/pipelex/pull/1089) (see `pipelex/wip/native-date-time/`) and regenerated; `make fixtures-live ONLY=pipeline_32` remains the end-to-end check that the temporal natives survive a live run.

## The vendored MTHDS Test Corpus

`data/mthds-corpus/` is a byte-identical copy of the MTHDS Test Corpus — the one canonical, tagged set of `.mthds` methods every repo in the workspace draws its language-level fixtures from. It is owned by `pipelex` (`pipelex/test_extras/mthds_corpus/`), where the corpus gates run, and it arrives here through the workspace's `mthds-corpus-sync` skill. **Nothing under `data/mthds-corpus/` is edited in this repo.** An entry that needs fixing is fixed in `pipelex`, where a change is checked against the vocabulary, the exhaustivity gate and the entry-validation gate; then the copy is re-synced. Editing it here would fork the corpus, which is the one failure mode the whole arrangement exists to prevent.

Why a copy at all, when the corpus ships inside the `pipelex` wheel: a TypeScript repo cannot read a Python wheel. Consumers that _can_ import `pipelex` use the wheel and keep no copy, so they are in lockstep by construction; the vendored channel exists for the cross-language repos.

**What it feeds, and what it deliberately does not.** The corpus carries methods and their manifests — no generated graph specs. So it feeds exactly the two sweeps that need nothing but the method text, and those two run over both piles through the shared discovery in `src/static-graph/__tests__/fixtureBundles.ts`:

- `parseFixtureBundles` — every entry's bundle parses with no error diagnostics.
- `buildFixtureGraphs` — the static builder turns each into a `validateGraphSpec`-clean spec, deterministically.

That is the valuable half. Running this repo's builder — a second, independent implementation of MTHDS — over the canonical corpus is precisely the cross-language conformance the corpus was built to provide.

`parity` and `nativeConceptsCorpus` keep reading `data/pipelines/` only, because both need a `dry_run_graph_spec.json` produced by actually running pipelex, and the corpus has none. **`data/pipelines/` is therefore not superseded and is not going away**; the two piles answer different questions, which is why `fixtureBundles.ts` keeps them apart rather than merging them into one list.

Only each entry's entry point is swept. A multi-file entry keeps its library files beside it — forward-declared signatures and the pipes that fill them — and those are fragments that mean nothing read on their own. The contract resolves an entry directory to its single `.mthds` file, or, when it holds several, to the `bundle.mthds` among them; the discovery helper mirrors both cases and throws on an entry matching neither, rather than dropping it silently from the sweep.

## Limitations

- Static graphs are not execution proof. Validation and dry runs still own
  executability.
- Runtime data, rendered prompts, timings, metrics, and live statuses are absent.
- Batch graphs render one representative branch, not sampled fan-out.
- The builder renders methods as authored; it does not mirror runtime
  elaboration rewrites such as possible preliminary-text expansion.
- Dependency refs without bundled source render as opaque `PipeSignature` leaves.
