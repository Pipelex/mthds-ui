# TODO — Stop hiding optional fields in the dry-run concept panel

## Context (cold-start summary)

**The bug.** In dry mode, `ConceptDetailPanel` filters the schema table down to required fields only. This is wrong for three reasons:

1. **Dry mode has no Data view at all.** `ConceptBody` computes `hasData = Boolean(ioData) && !isDryRun` (`src/graph/react/detail/ConceptDetailPanel.tsx:90`) and returns the structure view directly when false (`:105`). So in dry mode, the Structure view is the _only_ view — and it describes the concept, not an instance. The rationale a required-only filter would need ("an absent optional has nothing to show") applies to a data view, which doesn't exist here. The filter lands on a concept description and makes it lie.
2. **It makes the `req` badge column vacuous.** `SchemaTable` has a dedicated badge column marking required fields (`ConceptDetailPanel.tsx:206`). With the filter (`:188`), every visible row in dry mode is required, so the badge appears on 100% of rows — the filter destroys exactly the information the column exists to convey.
3. **Concrete fidelity harm.** `native.Date` is pinned as `date` + optional `time`; the dry panel asserts date-only — the precise distinction the concept exists to make. This applies to every concept in a dry spec; it's only invisible for authored concepts because pipelex marks authored structure fields required.

Introduced in commit `943dbfe` ("pipe cards"), untouched since. Discussed and confirmed as a real bug at the end of PR #68's session; deferred to this PR.

**What must survive.** `isDryRun` on `ConceptDetailPanel` does two jobs. Only one is the bug:

- ✅ Keep: suppressing fabricated dry-run payloads (Polyfactory data like "Polyfactory Jane") — the `!isDryRun` in `hasData` at `:90`. This is correct and stays.
- ❌ Delete: the required-only filter in `SchemaTable` at `:188` (and the now-unused `isDryRun` prop on `SchemaTable`).

**The test trap (read before touching the test).** `src/graph/react/detail/__tests__/ConceptDetailPanel.test.ts` looks like it protects dry-run data suppression, but passes for the wrong reason: the fixture's _schema_ declares an optional field named `generated_summary`, and the fixture's _data_ payload has a key with the same name. The assertion `expect(html).not.toContain("generated_summary")` is currently satisfied by the schema-field filter, not by the data suppression it claims to test. After deleting the filter, the optional schema field will (correctly) render, so this assertion would fail — that failure is the fix working, not a regression. Restructure the fixture so schema field names and data payload strings no longer coincide, so the test checks what its name says.

**Files touched:**

- `src/graph/react/detail/ConceptDetailPanel.tsx` — the fix
- `src/graph/react/detail/__tests__/ConceptDetailPanel.test.ts` — fixture rename + strengthened assertions
- `src/graph/react/detail/__stories__/Stuff/ConceptDetail.stories.tsx` — story rename (`DryRunSchemaOnly`, display name "Dry Run (Required Fields Only)" at `:52`)
- `CHANGELOG.md` — Unreleased entry

`GraphViewer.tsx` (`:202`, `:211`, `:217`) passes `isDryRun` into `ConceptDetailPanel` — that plumbing is unchanged; the prop keeps its data-suppression job.

## Implementation

- [x] **Delete the filter.** In `SchemaTable` (`ConceptDetailPanel.tsx`), remove the `visibleFields = isDryRun ? fields.filter(...)` line — always render all fields. Remove the now-unused `isDryRun` prop from `SchemaTable`'s signature and from its call site at `:99`. Do NOT touch `hasData` at `:90` — dry-run data suppression stays.
- [x] **Fix the test so it checks what it names.** In `ConceptDetailPanel.test.ts`: rename the fixture's optional _schema_ field from `generated_summary` to `summary` (description stays distinct from the data payload's strings), and keep the _data_ payload's fabricated strings unique (`"Polyfactory Jane"`, `"Generated dry-run payload that should not display"`). Update the dry-mode test to assert:
  - structure renders (`"Structure"`, `"name"`)
  - the optional field IS visible in dry mode (`"summary"` present) — the new regression guard for this fix
  - fabricated data is NOT rendered (`"Polyfactory Jane"`, `"Generated dry-run payload"` absent) — now genuinely testing data suppression
- [x] **Rename the story.** In `ConceptDetail.stories.tsx`, change `DryRunSchemaOnly`'s display name from `"Dry Run (Required Fields Only)"` to `"Dry Run (Schema Only)"`.
- [x] **Changelog.** Add an Unreleased entry in `CHANGELOG.md`: dry-run concept panel no longer hides optional schema fields (fixed a filter that made the structure view misrepresent concepts, e.g. `native.Date` shown without its optional `time`).

## Verification

- [x] `make check && make test` pass. (lint/format/typecheck clean; 1818 tests, 129 files, all green)
- [x] **Rule 2 visual pass (the real cost of this change — every dry panel renders differently).** `make storybook` (port 6006), verify with `/browse`:
  - `Misc/Detail Panel/Stuff/Concept Detail` → "Dry Run (Schema Only)": optional fields now visible, `req` badges only on required rows (the badge column is meaningful again).
  - A dry pipeline story (PipelineSmoke / DRY catalog): click a stuff node for a concept with optional fields — `native.Date` in pipeline_32/33 (temporal natives) is the motivating case: `time` must appear as optional.
  - Confirm no fabricated data leaks: a dry stuff node's panel must still show structure only, no Data tab, no Polyfactory values.
  - Sanity-check a LIVE story: Data/Structure tabs unchanged, Structure tab shows all fields (it always did outside dry mode — non-dry behavior must be identical).
- [x] Confirm `snapshots.test.ts` unaffected (change is render-layer only; structural snapshots cover graph logic).

## Progress log

**Implementation + verification complete** (this session).

- `SchemaTable` no longer takes `isDryRun`; it renders every field. `hasData`'s `!isDryRun` (data suppression) untouched.
- Test fixture: optional schema field renamed `generated_summary` → `summary`, payload values kept disjoint from field names, plus a new `describes optional schema fields too` case asserting `summary` / `Short pitch` render in dry mode.
- Story renamed to "Dry Run (Schema Only)"; changelog entry added under Unreleased → Fixed.
- `make check` clean, `make test` green (1818 tests / 129 files), snapshots unchanged.
- Visual pass on Storybook (localhost:6006), verified with `/browse`:
  - `Dry Run (Schema Only)`: all four `CandidateProfile` fields render; `req` badges on `name` + `summary` only — the badge column carries information again.
  - Pipeline 32 Dry Run → `dates` stuff node (`native.Date`): shows `date` (req) **and** `time` (union, optional). The motivating bug is gone. No tabs (`[role=tab]` count 0), no fabricated payload text.
  - Pipeline 32 Live Run → same concept: Data/Structure tabs intact, Data selected by default, Structure lists all fields. Non-dry behavior identical to before.

## Final state — PR #69

https://github.com/Pipelex/mthds-ui/pull/69 (base `dev`), 3 commits:

- `981c74d` fix: stop hiding optional fields in the dry-run concept panel
- `6284949` docs: mark the dry-run optional-field defect resolved in its wip note
- `9f5b7be` test: make the dry-mode fixture's disjointness claim actually hold

**Found after the first pass** (independent cold-context review, both fixed):

1. The fixture's disjointness claim only held for payload *values*. The payload **key** was `summary` — spelled exactly like the optional schema field the new regression case asserts on — and `StuffViewer` renders payloads as `JSON.stringify`, so keys reach the same HTML the schema assertions read. Same trap class this PR removes, one field over. Payload keys are disjoint now.
2. The scope claim in this doc (§Context item 3) is **wrong** and was corrected in the PR body and in `wip/native-concept-shadowing.md` §4b: the filter was *not* invisible for authored concepts. Sweeping the committed dry corpus, `recruitment.CandidateProfile`, `recruitment.MatchScore`, `content_moderation.SafetyScore`, `cv_matching.CvEvaluation`, `cv_batch_screening.JobRequirements` / `CandidateProfile` and `rfp_qualification.CapabilityMatch` all carry optional properties. The natives are where it was noticed, not where it applied — this fix changes rendering across most of the dry corpus.

**Deliberately not deferred to `wip/`** (judged not to meet the bar; overrule if you disagree): optional fields rendering as `union` is already §4 of `wip/native-concept-shadowing.md`; the schema table's missing `word-break` is pre-existing and belongs in §4 too; guarding a malformed non-object schema property is defensiveness against input pipelex cannot emit.

**Status:** CI green (Quality Checks, gate-release, CLAAssistant). Greptile 5/5 and cubic "no issues found", both re-run against `9f5b7be`. `mergeStateStatus: CLEAN`, no unresolved threads. **Not merged** — awaiting explicit confirmation.
