# TODO — put the `YesNo` / `Date` / `Time` natives into the `data/pipelines/` corpus

PR [#64](https://github.com/Pipelex/mthds-ui/pull/64) taught the static graph the three missing native codes, but the only place they appear is an inline-TOML Storybook story. Nothing in `data/pipelines/` uses them, so every fixture-driven sweep in the repo — and the one honest oracle we have for the catalog's wording — still never sees them. This plan adds real bundles.

## Why

**The natives have no fixture coverage.** `grep -rn "YesNo\|Date\|Time" data/pipelines/*/bundle.mthds` returns nothing. Their only story is `Graph - static/Valid/Examples → NativeConcepts` in `StaticGraphDev.stories.tsx:155`, built from an inline `NATIVE_CONCEPTS_BUNDLE` string.

That matters more than "one more story would be nice", because three test sweeps auto-discover `data/pipelines/pipeline_*` and get the new bundles for free:

- `parseFixtureBundles.test.ts` — every bundle parses with no `error` diagnostics.
- `buildFixtureGraphs.test.ts` — every bundle builds a `validateGraphSpec`-clean static spec, deterministically.
- `parity.test.ts` — the static builder's topology matches pipelex's own dry-run spec, per pipeline.

None of them needs wiring; they read the directory. An inline story bundle is invisible to all three.

**The inline bundle is not runnable by pipelex, and that is the point.** Its prompts read `"List the employment dates in @cv"`. pipelex 0.42.0 rejects that outright — _"Inline `@request` is not allowed on line 1: the `@` sigil produces tag-wrapped block content and must appear alone on its own line."_ (verified; it is the first thing that failed when probing this plan). So our only coverage of the three natives is a bundle the runtime would refuse — a preview of something no author can actually run. A `data/pipelines/` bundle cannot be in that state: the generator runs it through pipelex.

**It unblocks the deferred description oracle.** `wip/native-concept-shadowing.md` §3 proposes asserting our hand-copied descriptions against `data/pipelines/*/dry_run_graph_spec.json`, whose `concept_registry` carries pipelex's own text for every native it touches — an oracle this repo did not author. It was left as a stopgap with one caveat that killed it: _"coverage is incidental … none of the three this PR added"_. These bundles remove that caveat.

**And it is the only way to close the addition gap.** `docs/static-graph.md` states that the catalog-guard test "cannot detect an upstream addition on its own, since both lists live here". A corpus oracle is a second list that lives _upstream_ — a native code pipelex knows and our catalog lacks becomes a failing test in this repo, for every code the corpus reaches.

## Verified before writing this (probes, not assumptions)

Ran against the local `../pipelex/.venv/bin/pipelex`, dry-run, `--mock-inputs`, no inference:

- **All three natives are authorable and survive a real dry run.** `output = "Date[]"`, `output = "Time"`, `output = "YesNo"`, and `[concept.Verdict] refines = "YesNo"` all produce a clean graphspec. The registry comes back with `native.Date` / `native.Time` / `native.YesNo`, `structure_class_name` `DateContent` / `TimeContent` / `YesNoContent`, and `scheduling.Verdict` carrying `refines: "native.YesNo"` — the exact shape our static builder produces.
- **Natives work through controllers too.** `batch_over` a `Date[]` fans out into a `PipeBatch` controller with per-item children; a `PipeCondition` with `expression = "urgent.yes_no"` and `outcomes = { true = …, false = … }` parses and routes (both branches run under dry-run, as usual).
- **The oracle would pass today, byte-for-byte.** Scanning every committed `dry_run_graph_spec.json` plus the probe outputs: every native's `description` and `structure_class_name` matches `NATIVE_CONCEPT_DESCRIPTIONS` exactly, and pipelex exposed no code our catalog lacks. The committed corpus currently reaches `Anything`, `Composite`, `Document`, `Image`, `Page`, `SearchResult`, `Text`.
- **`Number`, `Html`, `TextAndImages`, `JSON` are authorable as plain `PipeLLM` outputs.** So a sampler bundle can lift oracle coverage to every native except `Dynamic`, which has no authorable output position.
- **Mock `Date[]` payloads are real `{date, time}` records.** So the fixtures also give us the first look at how a native temporal payload renders in `StuffViewer` — a path `TODOS` previously called out as having no table to extend.

## Scope

**In scope**

- New `data/pipelines/pipeline_NN/` bundles that use the three natives, with DRY and LIVE fixtures generated the normal way.
- The full wiring so they appear as `Graph - from run/*` and `Graph - static/*` stories, like every other pipeline.
- A corpus-oracle test for native descriptions and structure class names.
- `docs/static-graph.md` + `CHANGELOG.md`.

**Out of scope, deliberately**

- **Regenerating the existing corpus.** The local pipelex CLI is **0.42.0**; the committed fixtures were generated on **0.41.0** (the changelog's `templating_style` entry says as much: the specs still carry the key and will drop it "on the next `make fixtures` regeneration"). A bare `make fixtures` would sweep all of them onto 0.42.0 output in a change that is about natives. Always pass `ONLY=`. A deliberate corpus sweep is its own change.
- **Native `json_schema`** (`wip/native-concept-shadowing.md` §3) and **the `SchemaTable` type column** (§4). These fixtures make the gap _more_ visible on a static-vs-live comparison — that is useful evidence, not a reason to fix it here.
- **The `shadows-native-concept` diagnostic** (§1/§2). Unrelated decision.

## Naming and numbering

The highest data directory is `pipeline_31`, so the new ones are `pipeline_32` onward. Note the story numbering has already drifted from the directory numbering — `Pipeline27.stories.tsx` is a generator-driven extreme (no directory) and `Pipeline29.stories.tsx` renders `pipeline_26` — so check both before claiming a number. `32` / `33` / `34` are free on both sides.

| Directory     | `NAME_MAP` const       | Catalog label                                        |
| ------------- | ---------------------- | ---------------------------------------------------- |
| `pipeline_32` | `MEETING_TRIAGE`       | `32 - Meeting Triage (Date / Time / YesNo)`          |
| `pipeline_33` | `AVAILABILITY_ROUTING` | `33 - Availability Routing (natives in controllers)` |
| `pipeline_34` | `ALL_NATIVE_CONCEPTS`  | `34 - All Native Concepts`                           |

`34` follows the existing synthetic-exhaustive genre (`14 ALL_PIPE_TYPES`, `25 ALL_CONTROLLER_TYPES`), so it is not a new kind of fixture.

## The wiring checklist (per pipeline)

Every new pipeline touches the same places. Two of them are easy to miss.

1. `data/pipelines/pipeline_NN/bundle.mthds` — authored.
2. `data/pipelines/pipeline_NN/inputs.json` — required for the LIVE run. A `native.Text` input is a two-line file; see `data/pipelines/pipeline_17/inputs.json`.
3. `scripts/generate-fixtures.mjs` → add the `NAME_MAP` entry. A directory absent from `NAME_MAP` is skipped entirely by the generator (though the three auto-discovering test sweeps still read it).
4. `make fixtures ONLY=pipeline_NN` → writes `dry_run_graph_spec.json`, `specs/_generated/dry/pipeline_NN.ts`, and rewrites the DRY barrel (other pipelines reused from disk).
5. `make fixtures-live ONLY=pipeline_NN` → same for LIVE. Needs `PIPELEX_GATEWAY_API_KEY` (e.g. in `~/.pipelex/.env`).
6. `mockGraphSpec.ts` — import, re-export, `DRY_RUN_CATALOG` entry.
7. `liveGraphSpec.ts` — same for `LIVE_*`.
8. `specs/_generated.static.ts` — **hand-maintained despite the `_generated` name.** No script writes it. Add the `?raw` bundle import and the `staticSpec(...)` export.
9. `staticGraphSpec.ts` — import, re-export, `STATIC_RUN_CATALOG` entry.
10. `pipelines/PipelineNN.stories.tsx` — copy `Pipeline31.stories.tsx`; title `Graph - from run/NN <Label>`; import the DRY and LIVE **split** modules directly (`./specs/_generated/dry/pipeline_NN`), never the barrel.
11. `PipelineSmoke.stories.tsx` — one `makeStory(DRY_RUN_CATALOG.DRY_<NAME>.spec)` export; the file is written by hand, not generated from the catalog.

**Gotcha — a partial DRY run does not bootstrap the LIVE placeholder.** The placeholder block in `generate-fixtures.mjs` is guarded `if (!LIVE && !PARTIAL)`, and `--only` sets `PARTIAL`. So `make fixtures ONLY=pipeline_32` leaves no `_generated/live/pipeline_32.ts` and no barrel entry, and the story's LIVE import fails typecheck. Every pipeline in the repo currently has a _real_ LIVE spec (no placeholders on disk), so the house convention is to generate both — which is also the cheapest fix here, since these bundles are short-text `PipeLLM` chains with no document, image generation, or search. Do the LIVE run.

**Optional, once the above bites:** the `!PARTIAL` guard looks over-conservative — in partial mode `specs` is completed from disk before the barrel is written, so the placeholder bootstrap would be correct as long as it stays `existsSync`-guarded and the barrel rewrite is skipped when any pipeline was omitted for lack of an on-disk spec. Worth a small generator change so future partial additions do not hit this wall; not required by this plan.

---

## Phase 1 — `pipeline_32`, the natives at a glance

A short scheduling method: read the proposed dates, read the preferred time, judge urgency, decide. It puts a `Date[]`, a `Time` and a bare `YesNo` stuff node on screen, plus a local concept refining a native — the four resolution paths the catalog fix touched, in one graph.

```toml
domain      = "scheduling"
description = "Triage a meeting request: proposed dates, preferred time, urgency, verdict"
main_pipe   = "triage_request"

[concept.Verdict]
description = "Whether the meeting request is accepted"
refines     = "YesNo"

[pipe.triage_request]
type = "PipeSequence"
description = "Read a meeting request and decide"
inputs = { request = "Text" }
output = "Verdict"
steps = [
  { pipe = "read_dates", result = "dates" },
  { pipe = "read_slot", result = "slot" },
  { pipe = "is_urgent", result = "urgent" },
  { pipe = "decide", result = "verdict" },
]
```

with `read_dates → Date[]`, `read_slot → Time`, `is_urgent → YesNo`, `decide → Verdict`. **Every `@ref` must sit alone on its own line** — that is what the inline story bundle gets wrong and what pipelex rejects. Use the block form the other fixtures use.

Also in this phase, a decision on the existing inline story. **Recommended: delete `NATIVE_CONCEPTS_BUNDLE` and the `NativeConcepts` story from `StaticGraphDev.stories.tsx` once `pipeline_32`'s static story exists.** The inline genre in that file is for bundles pipelex _cannot_ run (`WipBrokenBundle`, `Signature`); a valid bundle does not belong there, and keeping a copy whose prompts the runtime rejects teaches a shape no author can use. The alternative — fix its sigils and keep both — leaves two bundles saying the same thing, one of which nothing verifies.

Wire it up per the checklist, plus:

- A `StaticVsLive.stories.tsx` entry: `export const MeetingTriage = compare("STATIC_MEETING_TRIAGE", "LIVE_MEETING_TRIAGE")`. This is where the natives' "Schema not available" (static) versus pipelex's field table (live) becomes visible side by side — the evidence `wip/native-concept-shadowing.md` §3 is waiting on.
- Optionally add `STATIC_MEETING_TRIAGE` to `STATIC_SNAPSHOT_KEYS` in `snapshots.test.ts` (that list is explicit, unlike the DRY/LIVE catalogs which are iterated whole).

## Phase 2 — `pipeline_33`, natives through the controllers

Phase 1 only exercises natives as flat sequence steps. This one puts them where the graph machinery actually works on them: `batch_over` a `Date[]` (so a native list drives a `PipeBatch` fan-out and its per-item stuff), and a `PipeCondition` whose `expression` reads `urgent.yes_no` (so a native's _structure field_ drives branching). Probed and working; shapes mirror `pipeline_07` and `pipeline_08`, both of which pass parity today.

This is the phase most likely to surface something real. If `parity.test.ts` reports a divergence on it, that is a finding — either a static-builder gap worth fixing or an entry in `ACCEPTED_DIVERGENCES` **with a reason** — not something to route around by simplifying the bundle.

---

**CHECKPOINT** — Phases 1 and 2 are the user-visible ask (`data/pipelines/` bundles that use the natives, with stories) and are independently shippable. Update this doc with what landed, any parity divergences found, and whether the inline story was removed, before opening Phase 3.

### Checkpoint record — Phases 1 and 2 landed

**Both pipelines are in.** `pipeline_32` (`MEETING_TRIAGE`) and `pipeline_33` (`AVAILABILITY_ROUTING`) are authored, generated, and wired through every step of the checklist: `NAME_MAP`, DRY fixtures, `mockGraphSpec.ts`, `liveGraphSpec.ts`, `_generated.static.ts`, `staticGraphSpec.ts`, `PipelineNN.stories.tsx`, `PipelineSmoke.stories.tsx`, plus the `StaticVsLive` comparison and `STATIC_MEETING_TRIAGE` in `STATIC_SNAPSHOT_KEYS`.

**No parity divergences.** `ACCEPTED_DIVERGENCES` is still empty. The static builder matches pipelex's dry spec for both bundles — including Phase 2's controller paths, the batch fan-out over a native `Date[]` and the condition branching on `urgent.yes_no`. Phase 2 was flagged as the phase most likely to surface something; on parity it came back clean.

**The inline story is gone.** `NATIVE_CONCEPTS_BUNDLE` was deleted from `StaticGraphDev.stories.tsx`. The `NativeConcepts` story slot survives, now backed by `STATIC_MEETING_TRIAGE` — same story name, real corpus bundle behind it.

**Snapshots: 5 added, 0 changed, 0 removed.** Verified by parsing entries out of both revisions and comparing shared keys, not by reading the textual diff (git's minimal diff around the insertion points is misleading). No 0.42.0-versus-0.41.0 sweep leaked in.

#### Finding — `Date` and `Time` cannot be produced by a live `PipeLLM`

This is the real result of the phase, and it invalidates the plan's "Do the LIVE run" instruction.

`make fixtures-live ONLY=pipeline_32` fails deterministically. A `PipeLLM` whose `output` is `Date`, `Date[]`, or `Time` dies on pydantic validation: `Input should be a valid date [type=date_type, input_value='2025-03-12', input_type=str]`. Isolated with single-native probes: **`YesNo` works live; `Date`, `Date[]`, and `Time` all fail.** A supplied `Date` **input** validates fine — so the same value pipelex accepts from an author it refuses from a model, which places the fault in the structured-output path, not the content models. `date_type`/`time_type` are pydantic's _strict_-mode codes, and neither field opts into strict (`YesNoContent.yes_no` does, deliberately, and survives because `bool` is a JSON type).

Filed upstream as `pipelex/wip/native-date-time-live-run.md`. The bundles are committed with their honest authored shape rather than restructured to dodge the bug — the plan is explicit that a Phase 2 finding is "not something to route around by simplifying the bundle", and the same reasoning applies to Phase 1.

Consequence: both pipelines carry a **placeholder** LIVE fixture (the DRY spec re-tagged). This is the first placeholder in the repo — every other pipeline has real LIVE data. `make fixtures-live ONLY=pipeline_32` is the natural regression check once pipelex is fixed.

#### Generator change — the `!PARTIAL` guard

The plan called relaxing this "optional, once the above bites". It bit: with `--only`, the LIVE placeholder bootstrap was skipped, so the new stories' LIVE imports could not resolve. The guard is now `!LIVE`, and the LIVE barrel is only rewritten when no pipeline was omitted for lack of an on-disk spec — the exact condition the plan specified. Each split write stays `existsSync`-guarded, so real LIVE data is never clobbered; verified that a partial run touched only the one new split.

#### Visual pass (Workflow Rule 2) — done for Phases 1 and 2

Storybook on 6006, checked `Graph - from run/32`, `Graph - from run/33`, `Graph - static/Valid/Examples → NativeConcepts`, and `Static vs Live → Meeting Triage`. No console errors on any of them. (The two ReactFlow "parent container needs a width and a height" warnings on the Static-vs-Live story are pre-existing — the same two appear on `simple-sequence`.)

- **32 renders all three natives as stuff nodes** — `dates Date`, `slot Time`, `urgent YesNo` — with `verdict Verdict` in violet, visibly distinct from the natives' teal, which is the local-concept-refining-a-native path on screen.
- **33 renders both controller paths.** The `dates Date` node feeds the `check_day_batch` BATCH group, which fans out to three branches each carrying its own `day Date` per-item stuff node, with `[0] [1] [2]` on the fan-out edges; `urgent YesNo` crosses to the `route_reply` CONDITION group, which shows both `reply_now` and `reply_with_options` branches.
- **The concept panel is correct, which is the core claim of the change.** Clicking `urgent YesNo` gives `YesNo` / `native` / "The answer to a yes/no question" — the pinned wording — plus pipelex's `yes_no: boolean (req)` field table. Clicking `dates Date` gives `Date` / `native` / "A calendar date, optionally with a time of day — as precise as its source states."
- **Static vs Live: identical topology**, the parity result made visual. The only difference is the run-status dots on the Live side.

**Multiplicity is not shown on a stuff node**, so the `Date[]` node reads `dates Date`. Checked rather than assumed: this is existing behavior, not native-specific — `docs/static-graph.md` scopes multiplicity badges to batch representative branches and folded batch cards, which is exactly where `33` does show them. Nothing to fix.

**New finding — an `anyOf` field loses its whole row in the concept panel.** `native.Date`'s pinned structure is `date` **plus an optional `time`**, and pipelex emits both; the panel renders only `date`. `time` is `{"anyOf": [{"type":"string","format":"time"}, {"type":"null"}], ...}` — the standard pydantic `X | None` shape — so it has no top-level `type`, and `extractType` reads only `schema.type`. The row does not render blank, it disappears, so the panel implies `native.Date` is date-only — the exact fidelity distinction the concept exists to make. Blast radius is narrow and was checked, not assumed: authored optionals emit a plain `type` (verified on `availability.SlotCheck.note`), so `anyOf` only reaches the panel from pydantic-derived native schemas, and `native.Date.time` is the only instance in the corpus. Recorded as §4b in `wip/native-concept-shadowing.md`, to be fixed with §4 — it is the same `extractType` line. Not fixed here: §3/§4 are explicitly out of scope, and these fixtures making the gap visible is the point.

#### Observation, not acted on

`PipelineSmoke.stories.tsx` stops at pipeline 25 — pipelines 26, 28, 30, and 31 were never added. Pre-existing drift from four prior changes, out of scope here. `32` and `33` were added per the checklist.

---

## Phase 3 — `pipeline_34` plus the corpus oracle

The bundle: one `PipeLLM` per remaining native output — `Number`, `Html`, `TextAndImages`, `JSON` — over a single `Text` input. All four are probed. Together with Phases 1–2 and what the corpus already reaches, that covers every native in the catalog except `Dynamic`, which has no authorable output position.

The test (`src/static-graph/__tests__/` — new file, `parity.test.ts`'s `readdirSync(PIPELINES_DIR)` shape) sweeps every `dry_run_graph_spec.json`, takes each `concept_registry` entry with `domain_code === "native"`, and asserts against our catalog:

- `isNativeConceptCode(code)` — **this is the one that catches an upstream addition.** A native pipelex emits that our catalog lacks fails here, which `docs/static-graph.md` currently says no in-repo test can do.
- `description` equals `nativeConceptInfo(code).description`.
- `structure_class_name` equals `nativeConceptInfo(code).structure_class_name`.

Guard it against going vacuous by asserting the **set of codes the corpus reaches** — write the expected list out, do not assert a count, same rule the existing catalog-guard test follows. Without that, deleting a fixture silently empties the test.

Document the failure mode next to the test, because it fails in a confusing place: regenerating fixtures against a newer pipelex breaks a _native-concepts_ unit test. That is the signal working, not a broken test — the message should say so and point at the catalog.

## Phase 4 — docs, changelog, verification

- `docs/static-graph.md` → "Native Concepts": replace the "cannot detect an upstream addition on its own" sentence with what is now true — the corpus oracle detects an addition for any native the corpus reaches, and the catalog-guard test still holds the ordering and the codes the corpus does not reach. Say plainly that `Dynamic` is outside it. Also extend "Fixture Catalog" with the new pipelines.
- `CHANGELOG.md` → `## [Unreleased]`. This is `### Added` (fixtures, stories, a test), not a fix — nothing was broken. Note in the same entry that the natives now have real fixture coverage in all three auto-discovering sweeps.
- `make check && make test`.
- **Snapshots:** the DRY and LIVE catalogs are iterated whole, so new entries are _added_ on the first local run (vitest writes new snapshots unless `--ci`). Read the added fingerprints before committing rather than accepting them blind. Existing entries should not change — if one does, the 0.42.0-versus-0.41.0 sweep leaked in somewhere.
- **Visual pass (Workflow Rule 2 applies — these are new graphs, not just logic):** `make storybook`, then check `Graph - from run/32`, `Graph - from run/33`, the matching `Graph - static/*` entries, and the new `Static vs Live` comparison. Specifically confirm: a `YesNo` stuff node's concept panel reads domain `native` with the pinned description; the `Date[]` node shows list multiplicity; the batch fan-out and the condition branches render; and look at how the mocked `{date, time}` payload renders in `StuffViewer` — that path has never had a native temporal payload to show, and whatever it does is worth recording here even if we do not act on it.

## Observations, not part of this change

- **The `add-pipeline-story` skill is stale.** `.claude/skills/add-pipeline-story/SKILL.md` still describes hand-writing spec files with a Python `json.dumps` snippet, wiring only `mockGraphSpec.ts`, and story titles of the form `Graph/GraphViewer/NN` — none of which matches the current `make fixtures` flow, the split `_generated/` modules, the static catalog, or the `Graph - from run/NN` titles. Anyone who invokes it while doing this work will be led into hand-written fixtures, which Workflow Rule 7 forbids. Worth its own pass; following this plan is the way to do it correctly in the meantime.
- **Inline story bundles are unverified against the runtime.** `NATIVE_CONCEPTS_BUNDLE` is the case in point, and the other inline bundles in `StaticGraphDev.stories.tsx` have never been through pipelex either. For the intentionally-broken ones that is the whole point; the risk is a _valid_ inline bundle drifting into an illegal shape with nothing to catch it. Promoting valid ones to `data/pipelines/` — as Phase 1 does — is the general fix.
