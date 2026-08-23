# K2 adoption — implementation tracker

Working plan for `wip/adopt-form/design.md` (RunPanel over `@pipelex/mthds-form`). Branch `feature/Adopt-form`, PR into `dev`. Each phase ends with `make check && make test` green before moving on.

## Phase 1 — plumbing

- [x] Add `@pipelex/mthds-form` to `package.json`: `peerDependencies` (`^0.2.0`) with `peerDependenciesMeta.optional: true`, and `devDependencies` for local development (mirror how `shiki` is handled).
- [x] Create the module skeleton `src/form/react/index.ts` (barrel; exports land in Phase 2) and add the `@form/*` → `src/form/*` path alias in all four registration places: `tsconfig.json` `paths`, `tsup.config.ts` `esbuildOptions.alias`, `.storybook/main.ts` `viteFinal` resolve alias, `vitest.config.mts` `resolve.alias`.
- [x] Wire the `./form/react` entry: add `src/form/react/index.ts` to the tsup `entry` array, and add `"./form/react"` to the `package.json` `exports` map (`import` + `types`, matching the existing entries).
- [x] Mark `@pipelex/mthds-form` and `@pipelex/mthds-form/react` as `external` in `tsup.config.ts` so the kernel is never bundled (context identity — Decision B).
- [x] `"use client"` directive: esbuild strips directive prologues, so re-prepend `"use client"` onto `dist/form/react/index.js` in tsup `onSuccess`, the same way `mthds-form/tsup.config.ts` does for its own react entry. Verify with `head -1 dist/form/react/index.js` after a build.
- [x] Import isolation (Decision B enforcement): add an eslint `no-restricted-imports` block in `eslint.config.mjs` — for files outside `src/form/**`, forbid the `@pipelex/mthds-form*` patterns with a message pointing at the design decision.
- [x] Consumer-shaped smoke test: `npm run build`, then from a scratch directory `npm pack` the tarball and verify with a small node script that (a) `@pipelex/mthds-ui/form/react` resolves and its kernel imports survive as externals, and (b) `@pipelex/mthds-ui/graph/react` imports cleanly **without** `@pipelex/mthds-form` installed. → landed as the committed `scripts/smoke-pack.mjs` + `make smoke-pack`, so the packaging contract stays re-checkable rather than being a one-off.
- [x] `make check && make test` green.

## Phase 2 — the panel

- [x] Extract the pure composition logic into `src/form/runGate.ts` (or similar pure module, no React): the four-step submit gate (`buildRunInputsSchema` → `prepareRunInputs` → `validateRunInputs` → `apiInputsFromSchemaData`) and the error-summary derivation (`describeValidationError` over the verdict, falling back to `errors` when `missingInputs` is empty — a documented legitimate state). Keeping this React-free makes it testable in the node vitest project.
- [x] Build `src/form/react/RunPanel.tsx` with the props from the design sketch: `contract: PipeIOContract`, controlled `values` + `onValuesChange`, `onRun(apiInputs)` firing only after the gate passes, `running?`, `env?: FieldEnv` passthrough, `title?`, `theme?: GraphTheme`.
- [x] Internals per Decision C: `fieldsForContract(contract)` for the field list, one `FieldRenderer` per field, `OptionalToggle` folding empty optionals, `computeReadiness` gating the Run button, value write-back with `setValueAtPath` keyed by the field's dotted-path `id`. The panel never reads `json_schema` to make a rendering decision and never sniffs value shapes.
- [x] Theme bridge (Decision D): the panel container toggles the kernel's `.dark` class in step with the `theme` prop, and carries a documented stable class name (e.g. `mthds-run-panel`) as the host hook for scoped shadcn token overrides.
- [x] `src/form/react/RunPanel.css` — panel chrome only, this repo's own tokens, no Tailwind. Register it in **both** tsup places (the `external` regex array AND the `onSuccess` `mkdirSync`+`cpSync` pair), add the `"./form/react/RunPanel.css"` export to `package.json`, and after building verify the import survives in `dist/form/react/index.js` and the file exists in `dist/`.
- [x] Export `RunPanel`, `RunPanelProps`, and anything else public from `src/form/react/index.ts`.
- [x] Unit tests in the node vitest project (`src/form/__tests__/`): the gate orchestration happy path, the invalid-with-empty-`missingInputs` fallback, and null/empty contract edges. The kernel's own behavior is not re-tested here. Add the new pure module(s) to the vitest coverage `include` list.
- [x] `make check && make test` green.

## ★ Checkpoint 1

- [x] Update `wip/adopt-form/design.md`: decisions confirmed or amended, SHAs of landed commits, deviations reconciled into the phases below. Verify the doc is cold-start ready for a fresh session.

## Phase 3 — stories and fixtures

- [x] Extend `scripts/generate-fixtures.mjs` to capture `pipe_io_contracts`: the pipelex validation report carries them keyed by `pipe_ref` (`pipelex/pipelex/pipeline/validation_report.py`), so add a validate call per bundle on the DRY pass and write a mode-independent `pipe_io_contracts.json` next to each bundle (same lifecycle as `inputs_template.json`). Never hand-write these.
- [x] Emit a generated fixtures module (e.g. `__stories__/pipelines/specs/_generated.contracts.ts`) from those JSON files, following the existing `_generated.*.ts` conventions, and run `make fixtures` to produce it.
- [x] Storybook prebuilt lane (Decision D): import `@pipelex/mthds-form/theme.css` and `@pipelex/mthds-form/styles.css` in `.storybook/preview.ts`. Then check that Tailwind preflight does not visually regress the existing graph stories; if it does, scope the imports to the form stories instead and note the deviation at Checkpoint 1's update.
- [x] `RunPanel.stories.tsx` under `src/form/react/__stories__/`: contracts covering required + optional fields, a plural input, a file field, and an enum; a running-state story; and an invalid-submit story surfacing the error summary.
- [x] The integration story: `GraphViewer` with `onNodeSelect` → `getPipeIOContract(contracts, domain, pipeCode)` (note the argument order — the kernel README shows it wrong) → `RunPanel` beside the graph, fed by the generated contracts fixture.
- [x] Browser play tests (`storybook/test` imports, `within(canvasElement)`): fill a required field and watch readiness flip, submit and assert the `onRun` wire payload (blank optionals omitted; empty plurals as bare `[]`), and exercise the optional-toggle fold.
- [x] Mandatory visual verification: `make storybook` + `/browse` over the new form stories AND a spread of existing graph stories (CV screening, nested controllers, wide parallel) to confirm the preflight decision above.
- [x] `make check && make test` green (includes the storybook vitest project).

## Phase 4 — docs and release prep

- [x] `docs/run-form-panel.md`: the panel's contract (props, what the host injects, what the kernel owns), the CSS lanes and the silent-purge trap warning inherited from `pipelex-app/docs/form-kernel-package.md`, the `.dark` bridge, and the stable container class hook.
- [x] README section for `./form/react`, and a cross-reference from `docs/theming.md` (panel chrome tokens vs the kernel's shadcn tokens; the deferred token-bridge open question).
- [x] Update `CLAUDE.md`: the `src/form/` module in the project structure, the `@form/*` alias, the optional-peer + entry-point pattern, and the contracts fixture in the test-data section.
- [x] CHANGELOG entry under `[Unreleased]` (additive: new entry point, new optional peer — a minor bump when released). No version bump now; the release rides the `/release` skill when Louis calls it.
- [x] Final `make check && make test && make build`, then open the PR from `feature/Adopt-form` into `dev`. → PR #75.

## ★ Checkpoint 2 (close)

- [ ] Verify the K2 gate: a story renders a method form where every field, the readiness verdict, and the wire payload come from kernel imports, and the only local code is layout.
- [ ] Record the closure in the workspace roadmap (`../wip/devx/input-form-roadmap.md`, Track K) per the program's checkpoint protocol, and update `wip/adopt-form/design.md` one last time.

---

## ▶ Resume here (cold start)

Phases 1–4 are landed and PR #75 is open against `dev`. What is left is the review loop and Checkpoint 2. Everything below is re-derivable from the repo; nothing here is a snapshot of live state.

**Where the work is.** Branch `feature/Adopt-form`, five commits on top of `cc2e536`:

| SHA       | Phase                                                                                       |
| --------- | ------------------------------------------------------------------------------------------- |
| `0556e6d` | 1 — the optional peer, the `./form/react` entry, import isolation, `scripts/smoke-pack.mjs` |
| `ded7bf6` | 2 — `runGate.ts`, `RunPanel.tsx`, `RunPanel.css`, unit tests                                |
| `ca75f42` | Checkpoint 1 — design doc updated with deviations and findings                              |
| `5fffd87` | 3 — contracts fixtures, form stories, the graph integration story                           |
| `ebbef28` | 4 — `docs/run-form-panel.md`, README, `docs/theming.md`, `CLAUDE.md`, CHANGELOG             |
| `551ca09` | Review round 1 — the four bot findings, plus the first coverage of the upload path          |
| `2723df9` | Review round 1 written into this tracker                                                    |
| `d54fb89` | Review round 2 — the two contracts-only generator paths                                     |
| `078c0f1` | Review round 3 — the contract-switch upload leak, and `--contracts --from-disk`             |

**Read first, in this order:** `wip/adopt-form/design.md` (the decisions and the Checkpoint 1 findings — the deviations and the two packaging traps are recorded there), then `docs/run-form-panel.md` (the shipped contract).

### What remains

- [x] Poll PR #75 until CI and the review bots have reported. CI green; both bots reported on `ebbef28`.
- [x] Fan out a sub-agent over the bot feedback. Two agents, one per file, each ruling CONFIRMED / INVALID / DEFER with evidence. Four findings, no duplicates between the bots — all four CONFIRMED, all four fixed in `551ca09`. Round 1 is written up below.
- [x] Rounds 2 (`d54fb89`), 3 (`078c0f1`), 4 (`d3fd5ba`), 5 (`824e8c5`) and 6: the re-review loop, written up below.
- [ ] Round 7: read the bots' re-review and repeat until they are satisfied.
- [ ] With the bots clean, fan out a sub-agent to run gstack's `/review @TODOS.md` with **no inherited context**, then finalize.

#### Review round 1 — what the bots found, and what was true

Four findings, all confirmed, all fixed in `551ca09`. Two of the four descriptions were wrong about _why_, which is the part worth carrying forward.

| Finding                                                              | Verdict                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| -------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Codex P1 — `ReferenceError: sources is not defined` in `writeBarrel` | Confirmed and reproduced. A copy-paste introduced by this PR: `sources` lives only in the sibling `writeContractsFixture`. It threw _after_ the pipelex runs and every artifact were written, so `make fixtures-live` would pay for real inference and then exit non-zero. Restored to `present.length`.                                                                                                                                                                                                                                                          |
| Codex P1 — the upload continuation writes a stale `values` snapshot  | Confirmed. `values` in the dep array creates a newer closure but does not refresh the running one. Fixed with a `valuesRef` read **only** by the async continuation. Not fixed with a functional updater: that needs `onValuesChange` widened to `Dispatch<SetStateAction<…>>`, a breaking change to a just-shipped public prop.                                                                                                                                                                                                                                  |
| Greptile P1 — Run stays enabled during an upload                     | Confirmed, **but not for the stated reason.** The "replace a populated file" path is unreachable: the kernel swaps the dropzone for a chip once a field has a value, so replacing means clearing first, which disables Run anyway. The reachable case is a _non-gating_ file input — `mustBeFilled` excludes lists, so a plural or optional file field never counts toward readiness and Run stays live through its upload. `cv_matching.screen_cvs` derives exactly that shape from the corpus. Same fix, different justification, and the code comment says so. |
| Codex P2 — `--from-disk` shells out to the Pipelex venv              | Confirmed. The corpus contracts had no on-disk JSON to reuse (the vendored corpus is read-only), so their split module _is_ their on-disk form and was being rewritten but never read. Now skipped under `FROM_DISK`, with the barrel built from what is on disk. Verified with `PIPELEX_PYTHON` pointed at a nonexistent interpreter: exit 0, files byte-identical. This one was masked by the `ReferenceError` above.                                                                                                                                           |

Two Storybook play tests now cover the upload path, which had **no** coverage before: `UploadHoldsRun` and `UploadKeepsConcurrentEdits`. Both were verified to fail against the unfixed panel before being kept.

Deferred rather than built, in `wip/adopt-form/deferred-upload-race-residues.md`: the same-batch clobber (needs the API break), the spurious key after a contract switch, and `dumpContracts`'s opaque ENOENT (now unreachable). **The middle one was deferred in error and round 3 overturned it** — see below. The identical pair of bugs lives independently in `pipelex-app` and is filed at `../wip/inbox/2026-08-23-pipelex-app-upload-race-in-method-app-form.md`.

#### Review rounds 2 and 3

Round 2 (`d54fb89`) was two findings on the contracts-only path in `scripts/generate-fixtures.mjs`, and the interesting part is that they took **opposite** resolutions on purpose. `--contracts --check` is now **rejected** rather than taught a no-write mode: `--check` asks "would a regeneration change anything," and the contracts pass is already offline and fast enough to just run, so a no-write mode would be machinery serving no question. `--contracts --from-disk`, by contrast, was **implemented** — unlike `--check`, `--from-disk` has a coherent meaning here and is what the flag does everywhere else in the script. The same round hoisted `--only` validation so every path rejects an unknown pipeline instead of silently sweeping zero.

Round 3 (`078c0f1`) produced the finding worth carrying forward, because **it overturned a deferral made in round 2.** The late-upload-after-a-pipe-switch case had been written off as harmless on the grounds that the run gate builds its payload from `contract.inputs` and never reads a key no field owns. That is true, and it was the wrong test: two pipes of one method routinely share an input name, and `recruitment.cv_screening` and `recruitment.extract_cv` both declare a required, gating `cv`. The key then _is_ owned by the new contract, so a file chosen for one pipe lands in the other looking like a deliberate answer, satisfies gating, and can be sent — with nothing in the form saying where it came from. `GraphWithRunPanel` is exactly that shape, since selecting a node resets the values.

The fix makes the `contract` the generation marker: a drop remembers the one it happened under, a result resolving under a different one is discarded, and switching contracts clears `uploadingIds` so a departed upload stops gating the new form. The consequence is documented rather than buried — **`contract` is now referentially significant**, so a host that rebuilds it every render loses in-flight uploads (and is already rebuilding every field, since `fields` memoizes on the same reference). `UploadDiscardedAfterPipeSwitch` pins it, verified to fail without the guard.

#### Review round 4

Both bots independently found the same defect, which is the round-3 fix being only half-applied: the write-back was scoped to its upload's generation but the `finally` cleanup was not. Switching pipes clears `uploadingIds`, which re-opens the dropzone, so a second upload can start on the same shared field id — and the first one finishing then deleted that id, un-marking an upload that was still running. Its dropzone re-opened mid-flight, its progress indicator vanished, and the Run gate let go of it. The kernel disables the dropzone while a field is uploading (`useDropzone({ disabled: disabled || uploading })`), which is what confines this to the contract-switch path rather than making it a general double-drop bug. Fixed by giving the cleanup the same generation check as the write-back; the asymmetry between the two was the smell.

Greptile's framing — "allowing submission with its file missing" — overstates one consequence: for a _gating_ input like `cv`, readiness still blocks Run because no value has landed. The unsafe submit needs a non-gating file input sharing an id across the two contracts. The other harms are real regardless, so the fix stands as written.

The second round-4 finding, a stale submit summary surviving a state change, was **split**. A summary describing pipe A's inputs must not stand over pipe B's form, so it now clears on a contract switch — `SubmitErrorClearedOnPipeSwitch` pins that. The other half, a host resetting `values` under an unchanged contract, is deliberately **not** fixed: keying the clear on `values` identity would make a rejected submit's explanation vanish before it could be read on any host that passes a fresh object each render, which is a worse failure than the stale message. Recorded as residue 3 in `wip/adopt-form/deferred-upload-race-residues.md`.

#### Review round 5 — the second deferral overturned

One finding, and it is the same shape as round 3's: something I had ruled out and written into the residues note, correctly identified as fixable. **Two of the three residues I filed turned out to be wrong**, and both for the same reason — I ruled the defect out on the strength of the only fix I had thought of, rather than on the defect itself.

Residue 1 was the same-batch write-back collision: `valuesRef` refreshed in an effect, so two uploads resolving in one React batch both read the same snapshot and the second write dropped the first. I closed it with "the only stale-proof fix is a functional updater," which would mean widening `onValuesChange` to `Dispatch<SetStateAction<…>>` — breaking a just-shipped prop and contradicting the fully-controlled contract. The trade-off was real; the premise was not. The continuation can advance the mirror **itself**, synchronously, before handing the values to the host, so the next continuation in the same batch builds on it. No API change, two lines. The effect still owns syncing _from_ the host, so the mirror converges on whatever the host actually kept.

I had underrated reachability too. `candidate_screening.screen_candidate` (`data/pipelines/pipeline_30`) takes a required `cv` and a required `job_offer`, both single documents, both dropzones — an ordinary two-file form. The failure shows nothing: each dropzone displays its filename while one value is gone from the values entirely. `ConcurrentUploadsBothLand` pins it, verified to fail without the advance.

**The pattern worth carrying into the next review loop:** every finding these bots got _wrong_ was wrong about the mechanism, never about there being a defect; every deferral I got wrong was wrong about the fix space, never about the trade-off I named. Probing the actual derived data settles the first kind. Nothing but a second opinion settles the second.

#### Review round 6 — the marker had to be commit-synchronous

One finding, from Codex: the generation marker introduced in round 3 is written by a **passive** effect, so it lags the commit. Between committing a switched contract and refreshing the marker there is a window in which the new form is already on screen while the marker still names the departed pipe — and an upload settling is a promise continuation, a microtask, which is exactly the kind of thing that runs inside that window. The guard then compares the departed contract against itself, finds them equal, and lets through precisely the write it exists to reject.

The first three harnesses I wrote for it all passed against the unfixed code, and that is the part worth carrying forward: **where an update originates decides whether the window exists at all.** Measured directly on React 19.2.4 in Chromium, by rendering a component that queues a microtask from a layout effect and recording the order:

| Switch originates in                   | Order observed                   |
| -------------------------------------- | -------------------------------- |
| a discrete click                       | layout → **passive** → microtask |
| `startTransition` started from a click | layout → **passive** → microtask |
| a timer, i.e. outside any React event  | layout → **microtask** → passive |

So a discrete update flushes its passive effects before any continuation can observe them, and a transition raised from a discrete event inherits that. Only an update arriving from outside a React event handler leaves the gap open — a timer in the test, and in a real host the same thing a fetch continuation, a router subscription or a websocket message does when it selects a pipe. Codex's own framing, "a non-discrete update," was right, and my two failed harnesses were the two cases that cannot fail.

The fix is `useEffect` → `useLayoutEffect` on both refs. Layout effects run inside the commit, so the marker is current exactly when the form is, and they run only for renders that actually commit — which is why assigning during render would be worse rather than better: a concurrent render React abandons would move the marker to a contract that never appeared, and an upload belonging to the pipe still on screen would be discarded instead. The values mirror gets the same treatment for the same reason; leaving one passive would be the round-4 asymmetry again, and there the cost is the host's newer edits overwritten. React 19 dropped the SSR warning for `useLayoutEffect` (verified against the installed `react-dom/server`), so the usual isomorphic-effect helper is not needed.

`UploadDiscardedBeforeEffectsFlush` pins it, verified to fail without the fix. Two details of that harness are load-bearing rather than scaffolding: the switch is scheduled off a timer, per the table above, and the upload settles from a layout effect because the window closes at the end of the commit and that is the only place inside it a component can act.

### ★ Checkpoint 2 (close) — still open

- [ ] Verify the K2 gate: a story renders a method form where every field, the readiness verdict and the wire payload come from kernel imports, and the only local code is layout. **The story that demonstrates it already exists** — `src/form/react/__stories__/GraphWithRunPanel.stories.tsx` (`Form/Graph with RunPanel`), which clicks a pipe in a `GraphViewer`, looks its contract up with the kernel's `getPipeIOContract`, and renders the form. What is left is to confirm and record the verdict, not to build anything.
- [ ] Record the closure in the workspace roadmap (`../wip/devx/input-form-roadmap.md`, Track K) per the program's checkpoint protocol, and update `wip/adopt-form/design.md` one last time.
- [x] Record the contracts-fixture reshape obligation — `wip/adopt-form/contracts-fixture-reshape-obligation.md`. The fixtures here are entirely pre-S2 (`optional` and a two-arm `multiplicity`; no `presence`, no `item_count`), and so is the kernel at the pinned `0.2.0` — the two agree, which is exactly why nothing in this repo can go red on its own however wrong the pairing becomes. The regeneration is owed **in the same change that bumps the kernel**, never before it.

### Things a fresh session would otherwise rediscover the hard way

- **`make test` story timeouts are load flakiness, not regressions.** A story file occasionally trips the 15s per-story timeout when 130+ story files run browsers in parallel. Re-run the single file (`npx vitest run --project storybook <path>`) before believing it.
- **A `Failed to fetch dynamically imported module: …/sb-vitest/deps/…` failure is a stale Vite dep cache**, not broken code. `rm -rf node_modules/.cache/storybook node_modules/.vite`. The kernel is now named in `.storybook/main.ts`'s `optimizeDeps.include`, which should stop it recurring.
- **`make fixtures` (the DRY graph-spec pass) still cannot run for every pipeline on this machine** — the local pipelex model deck is stale, so bundles referencing `linkup-standard` fail their dry run. This does NOT affect `make fixtures-contracts`, which deliberately skips the sweep. Nothing in this PR needs the graph specs regenerated; they were reused from disk.
- **`make check` does not run the tests** — it is lint + format-check + typecheck. Run `make test` separately.
