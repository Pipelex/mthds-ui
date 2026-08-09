# TODO — add the missing native concepts (`YesNo`, `Date`, `Time`)

**Done. PR [#64](https://github.com/Pipelex/mthds-ui/pull/64) is finalized and awaiting a merge decision** — every phase landed, both bot rounds and the finalization review are closed, all checks pass, no unresolved threads, `mergeStateStatus` CLEAN. Not merged: that needs explicit confirmation.

## Status

- **Phase 1 — done.** `src/static-graph/conceptRefs.ts` gained `YesNo` / `Date` / `Time` in the spec's canonical position, and the whole table now carries the pinned wording verbatim (verified against both `mthds/docs/spec/native-concepts.md` and pipelex's `pinned_blueprints.py`, which agree byte-for-byte). `Page` was drifted too — the pinned description is the long form ("…, comprising text and linked images and an optional page view image"); the plan's list of drifted entries had missed it. The file comment now names the spec as the authority.
- **Phase 2 — done.** `src/static-graph/__tests__/nativeConcepts.test.ts` covers all six cases from the plan: bare refs, `native.Date`, `YesNo[]` / `Date[2]`, `refines = "YesNo"` → `native.YesNo`, the catalog guard (asserts the full ordered code list, no counts), and the end-to-end build.
- **Phase 3 — done.** `docs/static-graph.md` gained a "Native Concepts" section; `CHANGELOG.md` gained the `### Fixed` entry. `make check` and `make test` pass, and `snapshots.test.ts` did **not** re-baseline — no committed fixture was riding the stub path.
  - Visual check done in Storybook (`Graph - static/Valid/Examples → NativeConcepts`). Concept panel for `Date` reads `native` + the full pinned description; `Verdict`'s panel reads `refines native.YesNo`. Only benign ReactFlow mount warnings in the console.
  - The scratch fixture was **promoted**, not reverted: `NATIVE_CONCEPTS_BUNDLE` + the `NativeConcepts` story now live in `StaticGraphDev.stories.tsx`, alongside the existing inline-TOML `WipBrokenBundle` / `Signature` stories. No `data/pipelines/` bundle exercises these codes, so this is the only story-level coverage of a native that carries no authored declaration.
- **Checkpoint code review — done.** 12 findings, sorted with a no-over-engineering bar.
  - **Fixed (7):** docs + changelog overclaimed what the catalog-guard test can detect (it makes a catalog edit a deliberate two-place change; it cannot see an upstream addition, since both lists live here) · `FIELD_TYPE_TO_JSON` in `parseMthdsBundle.ts` was stale against the same pipelex 0.41.0 release — `time` and `datetime` fell through to an untyped string and `date` still carried `format: "date-time"`; directly the natives' business, since `native.Date` is `date` + `time` · the catalog is now its own union (`NativeConceptCode` via `keyof typeof`) with an `isNativeConceptCode` guard, so `nativeConceptInfo` can no longer be handed a code the catalog lacks and the dead `?? code` fallback is gone · added a test for the local-shadows-native precedence branch, which the three new codes widen · reverted a markdown-table reformat a session hook made (unrelated churn; `docs/` is not covered by the repo's prettier glob) · unwrapped the new docs section per the workspace no-hard-wrap rule · qualified the sibling-repo citation paths in both the docs and the source comment.
  - **Deferred (3) → `wip/native-concept-shadowing.md`:** local-before-native precedence, the missing `shadows-native-concept` diagnostic, and the absent native `json_schema`. The first two are one decision (recommendation in the doc: emit the diagnostic, keep resolving local-first — a preview should render what the author wrote and say it will not validate); the third is all-or-nothing across the catalog.
  - **Declined (2):** pinning all fifteen description strings in a test (a second hand-copy in the same repo, edited in the same commit — the same non-guard the review rightly criticizes elsewhere, for display-only text) and adding a play function to the new story (the invariant it asserts is already unit-tested; a browser re-assertion buys nothing).

- **Phase 4 — done.** Brief written to `pipelex/wip/native-concept-codes-drift-invisible.md` (cross-repo convention: brief, not edit). While writing it, a **second live instance of the same drift** turned up: `vscode-pipelex/crates/taplo-lsp/src/handlers/mthds_resolution.rs` (`NATIVE_CONCEPTS`) has `YesNo` and `Date` but is **missing `Time`** — the brief calls that out as an immediate follow-up separate from the tooling work. `pipelex-js` does not drift; it drives its native table from an oracle script that byte-compares against the reference.

- **PR [#64](https://github.com/Pipelex/mthds-ui/pull/64) — open against `dev`.** Opened first against `main` by mistake; `gate-main` caught it ("Only release/vX.Y.Z branches may merge into main") and it was retargeted. Feature branches go to `dev` in this repo.
  - **Bot round 1 — Greptile, one P1, partially correct.** Claimed the temporal-format fix is ineffective because the concept panel cannot distinguish `date` / `datetime` / `time`. Verified: true of the panel — `extractType` in `ConceptDetailPanel.tsx` returns `schema.type` alone and drops `format`, `enum`, `items`, `default` — but equally true before the change, so the fix is a no-op on screen and a real correction to the `json_schema` in `GraphSpec.concept_registry`, which is public API. The defect was in the changelog's prose, not the code: the wording was corrected, the panel gap deferred as §4 of `wip/native-concept-shadowing.md`. Surfacing `format` alone would be arbitrary while `enum` stays hidden. Greptile accepted the correction.
  - **Bot round 2 — cubic, two P3s. One fixed, one declined.**
    - **Fixed:** `wip/native-concept-shadowing.md` cited `duplicate-concept` as proof the lenient-diagnostic machinery exists. It has exactly one emission site, `mergeBundles.ts:61`, guarded on the per-domain accumulator — so it only fires across bundles, and a code declared twice in one file never reaches it (`smol-toml` throws, `parseMthdsBundle` collapses the file into one `toml-parse-error`). The wrong pointer would have sent the next implementer to the wrong module. Now cites `invalid-concept-entry`, which `parseConcepts` pushes from inside the very loop a reserved-code check would extend.
    - **Declined:** narrowing `NATIVE_CONCEPT_CODES` to `ReadonlySet<NativeConceptCode>`. The observation is right (no production call site inside `src/` still reads the set), but `ReadonlySet<T>.has` is invariant in its argument, so on TS 5.9.3 the narrowing breaks every external `.has(someString)` with TS2345 — and arbitrary-string membership is the only reason to export a set of codes. It is a published export (`@pipelex/mthds-ui/static-graph`), so those callers are not hypothetical. The reverse consolidation compiles but buys nothing: both forms derive from the same object literal and cannot disagree, and `Object.hasOwn` and `.has` agree even on `constructor` / `toString` / `__proto__`. Noted but also left alone: the barrel exports the set without the guard or the `NativeConceptCode` type, so consumers get the loose test and not the narrowing one — an API addition on speculation, which does not belong in a catalog fix.

  - **Finalization review (gstack `/review`) — done. No source changed; both outcomes are deferrals.**
    - **Found and deferred → `wip/static-graph-prototype-key-crash.md`:** `resolveConceptInfo` reads `localConcepts[parts.code]` with a bare index, so a concept ref named after an `Object.prototype` member returns a prototype value — truthy, no `.code` — and the builder throws instead of stubbing. Reproduced independently: `output = "toString"` gives `TypeError: Cannot read properties of undefined (reading 'replace')` in `snakeCase` (`buildStaticGraphSpec.ts:309`). Pre-existing (unchanged context in this diff) and it violates the "never throws on content" contract both module headers state, but it is out of a catalog fix's scope, needs its own test, and opens an adjacent question the note raises — whether `parseConceptRef` should constrain the code grammar at all. Deferred per the standing "when in doubt, defer" rule; the note carries the one-line `Object.hasOwn` fix.
    - **Deferred → `wip/native-concept-shadowing.md` §3:** a cheaper way to hold the description wording than a second hand-written list. `data/pipelines/*/dry_run_graph_spec.json` is pipelex output, so its `concept_registry` natives carry pipelex's own descriptions — an oracle this repo did not author, unlike the fifteen-string pin the checkpoint review declined. Written up with both caveats: coverage is incidental (none of the three codes this PR adds appear in the corpus), and it would fail confusingly on `make fixtures`.
    - **No action:** the new story reaches `native.YesNo` only through `refines`, which the panel renders as inert text, so the headline code has no visual coverage. The invariant is already unit-tested, and editing the story would invalidate the recorded Storybook pass without re-running it.
    - Verified against the diff: the Status section's citations all hold, and the spec/runtime agreement is byte-identical on all fifteen codes, their order, and all fifteen descriptions. The `## Scope` section below is stale — `FIELD_TYPE_TO_JSON` is not in its three in-scope bullets — but the checkpoint entry above records that expansion and why.

## Why

`src/static-graph/conceptRefs.ts:18` declares `NATIVE_CONCEPT_DESCRIPTIONS` as a mirror of pipelex's `NativeConceptCode`, but three codes are missing: **`YesNo`**, **`Date`**, **`Time`**. They exist in both sources of truth:

- pipelex runtime — `pipelex/pipelex/core/concepts/native/concept_native.py:23` (`YES_NO`, `DATE`, `TIME`, with `YesNoContent` / `DateContent` / `TimeContent` structure classes)
- MTHDS spec — `mthds/docs/spec/native-concepts.md` (pinned normative definitions), `mthds/docs/spec/namespace-resolution.md:70` (the native code list used for bare-ref resolution)

Nothing throws today; the static graph silently renders these concepts wrong:

1. **A bare `YesNo` ref stub-resolves into the current domain instead of `native`** (`conceptRefs.ts:123` — the native fallback misses, so `resolveConceptInfo` falls through to `stubConceptInfo` at `:127`). Result: `domain_code` is the method's own domain, `description` is `""`, and `structure_class_name` is the synthetic `<domain>__YesNo` instead of `YesNoContent`.
2. **`native.YesNo` (explicitly qualified) stub-resolves too** (`conceptRefs.ts:113-116`) — right domain, still an empty description and a synthetic structure class name.
3. **`refines = "YesNo"` is qualified to `<domain>.YesNo` instead of `native.YesNo`** (`parseMthdsBundle.ts:100`), so the refinement chain points at a concept that does not exist.

The user-visible symptom is in the detail panels: an input/output typed `YesNo`, `Date`, or `Time` shows a blank description and the wrong domain — on exactly the authored-but-not-yet-run methods the static graph exists to render.

## Scope

**In scope**

- The catalog in `conceptRefs.ts` (one edit, everything else follows from it — `NATIVE_CONCEPT_CODES` is derived via `Object.keys`).
- Unit tests covering the three resolution paths above.
- `docs/static-graph.md` + `CHANGELOG.md`.

**Out of scope, deliberately**

- **`StuffViewer` rendering.** Its native handling is structural, not code-keyed — it sniffs an `inner_html` field out of `stuff.data` (`StuffViewer.tsx:128`, via `extractInnerHtml`). A `YesNo` / `Date` / `Time` payload renders through the generic JSON/text path with no table to extend.
- **Native structure schemas.** The spec pins a structure for each native (`yes_no = boolean`, `date` + `time`, …), but `ConceptInfo.json_schema` is optional (`src/graph/types.ts:183`) and `nativeConceptInfo` has never populated it for any native. Adding it for three codes only would be inconsistent; if we want pinned native structures, that is its own change covering the whole catalog.
- **The bundled JSON Schema** (`data/schema/mthds_schema.json`). Already at pipelex 0.41.0, and it does not enumerate native concept codes at all — which is precisely why this drift never showed up in a PR (see Phase 4).

## Phase 1 — extend the catalog

Single edit in `src/static-graph/conceptRefs.ts`, inserting after `Number` so the file keeps the spec's canonical order:

```ts
  Number: "A number",
  YesNo: "The answer to a yes/no question",
  Date: "A calendar date, optionally with a time of day — as precise as its source states.",
  Time: "A time of day, optionally with a UTC offset — as precise as its source states.",
  Page: "The content of a page of a document",
```

Descriptions are copied verbatim from `mthds/docs/spec/native-concepts.md`. Structure class names need no work: the `${code}Content` rule at `conceptRefs.ts:84` already produces `YesNoContent` / `DateContent` / `TimeContent`, matching the runtime classes.

**Decision to take while here:** the existing entries' wording has drifted from the spec's pinned definitions (`Dynamic` → spec says "A dynamic concept"; `TextAndImages` → "A text and an image"; `JSON` → "A JSON object"; `SearchResult` → "A search result with answer and sources"; `Composite` → "A named composition of contents"). The file's own comment calls these "display-only stand-ins", so nothing breaks either way — but adopting the spec wording for the whole table makes the source of truth unambiguous and costs nothing: no snapshot in `src/graph/__tests__/__snapshots__/snapshots.test.ts.snap` captures native descriptions. **Recommended: align the whole table in this pass.**

## Phase 2 — tests

`src/static-graph/__tests__/` (all inline-TOML, no CLI / gateway key / network — follow the `HAPPY_BUNDLE` pattern at the top of `parseMthdsBundle.test.ts`):

- **`resolveConceptInfo` — bare ref.** `YesNo` → `{ domain_code: "native", structure_class_name: "YesNoContent" }` with a non-empty description. Same for `Date`, `Time`.
- **`resolveConceptInfo` — qualified ref.** `native.Date` resolves to the native, not a stub.
- **Multiplicity still parses.** `YesNo[]` and `Date[2]` through `resolveStuffSpec`.
- **`refines` qualification.** A bundle with `[concept.Verdict]` / `refines = "YesNo"` yields `refines: "native.YesNo"` (guards `parseMthdsBundle.ts:100`).
- **Catalog guard.** Assert `NATIVE_CONCEPT_CODES` equals the code list the spec pins, so the next runtime addition fails loudly here instead of degrading into stubs. Write the expected list out; do not assert a count.
- **End-to-end through the builder.** A one-pipe bundle whose output is `YesNo`, built with `buildStaticGraphSpecFromToml`, lands a stuff whose concept is the native — the path a real method actually takes.

## Phase 3 — docs, changelog, verification

- `docs/static-graph.md` — note the native catalog and that its authority is `mthds/docs/spec/native-concepts.md`, mirrored from pipelex's `NativeConceptCode`.
- `CHANGELOG.md` under `## [Unreleased]` → `### Fixed`. It is a fix, not a feature: the codes were always valid MTHDS, the renderer just did not know them. Say what the user saw (blank description, wrong domain, synthetic structure class, broken `refines` chain) in the house style of the existing entries.
- `make check && make test`.
- Confirm `snapshots.test.ts` does **not** re-baseline. If it does, a committed fixture was silently riding the stub path — inspect the diff before accepting it rather than running `-u`.

**Visual check (light).** Not a layout change, so Workflow Rule 2 does not strictly bite. Still worth one eyeball: no `data/pipelines/` bundle currently uses these codes, so add a `YesNo` output to a scratch static story (or a throwaway bundle) and confirm the detail panel shows domain `native` plus the description instead of a blank. Revert the scratch fixture, or promote it to a real static story if it reads well.

---

**CHECKPOINT** — Phases 1–3 are the whole fix and are independently shippable. Phase 4 is prevention and can be dropped or deferred without leaving anything half-done.

---

## Phase 4 — stop it recurring (optional, cross-repo)

This drift was invisible because nothing enumerates native concept codes in any artifact we diff: `data/schema/mthds_schema.json` does not list them, and the `mthds-schema-sync` skill only propagates the JSON Schema. A native code added in pipelex therefore reaches this repo silently, degrading to a stub.

The fix belongs in the sync skill (diff `NativeConceptCode` alongside the schema, flag consumers holding a hardcoded copy), which lives outside this repo. Per workspace convention, do not edit it from here — write a short brief in `pipelex/wip/` describing the gap and the desired check.

Cheaper, in-repo alternative if we do not want the cross-repo change: the Phase 2 catalog guard test already turns a future divergence into a failing test the moment someone regenerates fixtures against a newer pipelex — it just cannot detect the divergence on its own.

## Observation (not part of this change)

`resolveConceptInfo` checks `localConcepts` **before** the native fallback (`conceptRefs.ts:121-124`), and `qualifyRefines` does the same (`parseMthdsBundle.ts:100`). The spec inverts that: `mthds/docs/spec/namespace-resolution.md:70` puts native concepts first — "Native concepts always take priority" — and `mthds/docs/implementers/validation-rules.md:26` makes a bundle that declares a native-named concept invalid outright. So local-first is only reachable via an already-invalid bundle, and mthds-ui is internally consistent about it. Adding `Date` / `Time` / `YesNo` widens the set of names that could shadow, which is why it is worth writing down. Two options if we pick this up later: flip the precedence to match the spec, or emit a new `shadows-native-concept` diagnostic (`src/static-graph/types.ts:14`) and keep resolving local-first. The diagnostic is the more useful of the two — it tells the author their bundle is invalid instead of quietly disagreeing with the runtime.
