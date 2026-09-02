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

### Multi-file method packages

A method may span several `.mthds` files: a root file carrying the boundary concepts and the entry pipe declared as a signature, plus one file per pipe that fills a forward declaration in. Pass them together — `buildStaticGraphSpecFromToml` accepts an array and merges before it walks:

```ts
const { spec, diagnostics } = buildStaticGraphSpecFromToml([rootToml, ...libraryTomls]);
```

Order only decides which bundle's `main_pipe` and `description` the merged set adopts, so lead with the entry point. It does **not** decide which definition of a pipe wins: a signature is a forward declaration and the concrete pipe of the same code is its definition, so **the concrete always wins**, matching how pipelex reconciles the same collision when it loads a library. The collision is silent when the two halves agree — that is, when the signature's `signature_for` is absent (it is an optional hint) or names the concrete's own type. A signature promising `signature_for = "PipeSequence"` that is filled by a `PipeLLM` still resolves to the `PipeLLM`, because a renderer draws what was built, but reports `signature-type-mismatch`: the merge is the only place that ever sees both halves at once. A clash the merge cannot resolve this way — two concrete pipes, or two signatures — keeps the first declaration and reports `duplicate-pipe`.

Passing the root file alone is not a smaller version of this: the entry pipe is a signature there, so the walk renders a single unexpanded leaf card.

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

## Concept Refs

An io ref names a concept and then, optionally, two suffixes in a fixed order — multiplicity before presence:

| Ref        | Multiplicity          | Presence                                             |
| ---------- | --------------------- | ---------------------------------------------------- |
| `Text`     | `null` (single)       | `plain`                                              |
| `Text[]`   | `true` (many)         | `plain`                                              |
| `Text[3]`  | `3`                   | `plain`                                              |
| `Text?`    | `null`                | `optional` — the slot may legitimately hold no value |
| `Text!`    | `null`                | `force` — a use-site assertion that a value is there |
| `Text[]?`  | `true`                | `optional`                                           |

`parseConceptRef` mirrors the suffix half of the runtime's `MULTIPLICITY_PATTERN` (`pipelex/core/pipes/variable_multiplicity.py`) exactly, so the two agree on every multiplicity/presence combination and reject the same malformed ones — `Text?[]` and `Text??` are not refs. The identifier half is deliberately looser here, as everywhere in this module: the runtime requires each dotted segment to start with a letter or underscore, while this parser accepts a leading digit (`1Text`) and repeated dots (`a..b.C`). A static renderer gains nothing from rejecting a name the runtime would reject anyway, so it renders what it was given. Both suffixes land on `StuffSpecInfo`, as `multiplicity` and `presence`, matching what pipelex serializes into a dry or live spec's `pipe_registry`; an absent `presence` reads as `plain`, the runtime's own default.

Both suffixes belong to an **io slot**, never to concept inheritance: `refines` names a concept, so a `refines` carrying either is refused with an `invalid-concept-ref` warning rather than silently stripped down to the bare code.

A ref the grammar does not accept is not fatal, but it is lossy in a way worth knowing: an input whose ref will not parse is **dropped from the pipe entirely** with an `invalid-concept-ref` warning, and an output that will not parse falls back to `native.Anything` with a `missing-pipe-output` warning. That is why the fixture sweep tolerates no warnings at all — a suffix the parser has not learned yet looks exactly like a method that never declared the slot, and a slot form it has not learned yet looks the same (see [Input Slot Declarations](#input-slot-declarations)).

## Input Slot Declarations

A value in a pipe's `inputs` table has two forms, and the standard (`docs/spec/mthds-format.md`, "Input slot declarations") states them equivalent:

```toml
[pipe.write_card.inputs]
title = "BookTitle"
notes = { concept = "Text?", hints = { intent = "prose" } }
```

`concept` is required and carries exactly the same grammar as the string form — ref, then multiplicity, then presence — so `{ concept = "Text?" }` resolves optional just as `"Text?"` does. `parseInputSlot` unwraps the table and hands `concept` to `parseConceptRef`, which means the resulting `StuffSpecInfo` is identical whichever form authored the slot. That identity is the point: a hinted input is an ordinary edge in the graph, and nothing downstream can tell how it was written.

The expanded form is **inputs only**. `output` is always a string, so `output = { concept = "Text" }` does not parse and falls back to `native.Anything` with the usual `missing-pipe-output` warning.

`concept` being required means a slot can fail two ways, and the `invalid-concept-ref` warning words itself for the one that happened: a slot table with no `concept` key at all is told the key is required, while a `concept` that was written and will not parse is told its ref is uninterpretable. The distinction matters because a hints-only slot — `notes = { hints = { intent = "prose" } }` — is the natural slip when reaching for the expanded form, and blaming a ref the author never wrote reads as a grammar problem when the fix is to add the key.

`hints` is read as a known key and then dropped. Its shape is not checked here either, and both of those are the same decision: **intent hints do not travel on the GraphSpec.**

### Why hints are parsed and dropped

Intent hints (`docs/spec/intent-hints.md`) are non-normative presentation intent, and they exist for renderers to honor — so a rendering library dropping them looks like a gap. It is not, and the reason is that the standard already routes them somewhere else.

- **The GraphSpec has no place to put them.** pipelex's runtime `StuffSpec` and `Concept` carry no `hints` field — hints live on the *blueprints* (`ConceptBlueprint`, the structure-field blueprint, `InputSlotBlueprint`), and a GraphSpec's `pipe_registry` is serialized from the runtime objects. Adding a `hints` member to `StuffSpecInfo` would put a field in a static spec that a dry or live spec can never carry, which is exactly what `parity.test.ts` exists to prevent.
- **The artifact that carries them is the input-form descriptor.** `docs/spec/input-form-descriptor.md` gives every field descriptor an optional `hints` object holding the node's *effective* hints — the key-by-key merge along the refinement chain and then the site layer — so a consumer reads one map and walks nothing. That merge needs the concept registry and the refinement chain, which is producer work, not something a graph renderer should be re-deriving from bundle text.
- **This library already consumes that channel.** `src/form/` renders the descriptor through `@pipelex/mthds-form`, so the hint an author writes on a slot reaches this repo's form panel by the route the standard designed for it. See `docs/run-form-panel.md`.

So a hint changes how a slot is *filled in*, never how it is *drawn*, and the static builder is the drawing half. If a graph card ever wants to honor `intent`, the change is to feed the viewer a descriptor beside the spec — not to widen `StuffSpecInfo`.

### Unknown slot keys

The slot table is closed: the spec says an unknown key MUST be rejected, and pipelex implements that as `extra="forbid"` on `InputSlotBlueprint`. This module renders rather than adjudicates, so it does neither of the two extremes. It reports the key with an `unknown-input-slot-key` warning naming it, and still resolves the slot from its `concept` — dropping the edge would lose more than the unknown key was worth, and staying silent would draw a clean graph for a bundle the runtime refuses.

That is also the line between a key and a malformed `hints` table. An unknown key may be where a future version of the standard puts something that changes the slot, so it is named. A malformed `hints` is content this module never reads, so reporting it belongs to a validating implementation, not to the renderer.

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

- `parseFixtureBundles` — every file of every entry parses with no error diagnostics, fragments included.
- `buildFixtureGraphs` — the static builder turns each entry, merged, into a `validateGraphSpec`-clean spec, deterministically and with no diagnostics at all.

That is the valuable half. Running this repo's builder — a second, independent implementation of MTHDS — over the canonical corpus is precisely the cross-language conformance the corpus was built to provide.

`parity` and `nativeConceptsCorpus` keep reading `data/pipelines/` only, because both need a `dry_run_graph_spec.json` produced by actually running pipelex, and the corpus has none. **`data/pipelines/` is therefore not superseded and is not going away**; the two piles answer different questions, which is why `fixtureBundles.ts` keeps them apart rather than merging them into one list.

A fixture is a set of files, not a file. A multi-file entry keeps its library files beside the entry point — forward-declared signatures and the pipes that fill them — and those are fragments that only mean something merged, so both sweeps take every `.mthds` file in the entry directory. `parseFixtureBundles` reads them one at a time, because each file must parse on its own; `buildFixtureGraphs` passes the whole set in, with `bundle.mthds` (when there is one) leading so the merge is deterministic. Sweeping the entry point alone would build the corpus's multi-file entry into a one-node signature stub and report it as a pass.

That is also why `buildFixtureGraphs` tolerates no diagnostic whatsoever, warnings included. Every entry is a canonical, runnable method, and the builder only reports something when it could not read what the method wrote — so on this material a warning and an error are the same news: either the builder has a gap or a fixture regressed. A `duplicate-pipe` warning would mean the merge stopped reading a signature and its concrete definition as one pipe; an `invalid-concept-ref` warning would mean a declared input silently vanished. Both pass every other assertion in the sweep, which is why severity is not the bar here.

**Only the entries the corpus marks `valid` are swept.** Each entry's `entry.toml` carries a `validity` of `valid` or `invalid`, and an invalid entry is surgically authored to trigger exactly one declared error — so under a zero-diagnostic rule it would report the corpus doing its job as a builder gap. This repo's declared slice takes the whole corpus rather than a filtered one (see the consumer registry in the `mthds-corpus-sync` skill), so the filter lives here, in `fixtureBundles.ts`. That red would be the mirror image of the vacuous green: a failure that means nothing, and that trains the next reader to loosen the gate.

**`validity` is the right axis here, and `fails_at` is not — measured against `pipelex` v0.51.0.** That release gave each non-excluded `error.*` vocabulary tag a `fails_at` of `schema` or `runtime`, naming the earliest layer of checking that rejects a bundle carrying the fault, and the contract's consumer rule is that a *structural* sweep expects a diagnostic exactly on the `schema` ones. This builder is not a structural sweep. It resolves pipe references, so it sits between a schema check and the `pipelex` runtime, and it sees faults on both sides of that line: running it over every invalid entry, the two `schema` entries (`invalid_missing_pipe_type`, `invalid_unknown_pipe_type`) report diagnostics as the rule predicts — but so do two `runtime` ones, `invalid_pipe_code_syntax` and `invalid_unresolved_pipe_dependency`, each on an unresolvable `main_pipe` or step. Branching on `fails_at` here would therefore go red on those two. `validity` stays the filter, and the fact that four entries produce diagnostics is what makes it load-bearing rather than decorative.

A directory holding no `.mthds` file at all throws, rather than dropping silently from the sweep — and so does an entry whose manifest is missing, unreadable, or carries a validity the contract does not define, because an entry the helper cannot classify is an entry it would otherwise drop unnoticed.

## Limitations

- Static graphs are not execution proof. Validation and dry runs still own
  executability.
- Runtime data, rendered prompts, timings, metrics, and live statuses are absent.
- Batch graphs render one representative branch, not sampled fan-out.
- The builder renders methods as authored; it does not mirror runtime
  elaboration rewrites such as possible preliminary-text expansion.
- Dependency refs without bundled source render as opaque `PipeSignature` leaves.
