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

- [ ] Extract the pure composition logic into `src/form/runGate.ts` (or similar pure module, no React): the four-step submit gate (`buildRunInputsSchema` → `prepareRunInputs` → `validateRunInputs` → `apiInputsFromSchemaData`) and the error-summary derivation (`describeValidationError` over the verdict, falling back to `errors` when `missingInputs` is empty — a documented legitimate state). Keeping this React-free makes it testable in the node vitest project.
- [ ] Build `src/form/react/RunPanel.tsx` with the props from the design sketch: `contract: PipeIOContract`, controlled `values` + `onValuesChange`, `onRun(apiInputs)` firing only after the gate passes, `running?`, `env?: FieldEnv` passthrough, `title?`, `theme?: GraphTheme`.
- [ ] Internals per Decision C: `fieldsForContract(contract)` for the field list, one `FieldRenderer` per field, `OptionalToggle` folding empty optionals, `computeReadiness` gating the Run button, value write-back with `setValueAtPath` keyed by the field's dotted-path `id`. The panel never reads `json_schema` to make a rendering decision and never sniffs value shapes.
- [ ] Theme bridge (Decision D): the panel container toggles the kernel's `.dark` class in step with the `theme` prop, and carries a documented stable class name (e.g. `mthds-run-panel`) as the host hook for scoped shadcn token overrides.
- [ ] `src/form/react/RunPanel.css` — panel chrome only, this repo's own tokens, no Tailwind. Register it in **both** tsup places (the `external` regex array AND the `onSuccess` `mkdirSync`+`cpSync` pair), add the `"./form/react/RunPanel.css"` export to `package.json`, and after building verify the import survives in `dist/form/react/index.js` and the file exists in `dist/`.
- [ ] Export `RunPanel`, `RunPanelProps`, and anything else public from `src/form/react/index.ts`.
- [ ] Unit tests in the node vitest project (`src/form/__tests__/`): the gate orchestration happy path, the invalid-with-empty-`missingInputs` fallback, and null/empty contract edges. The kernel's own behavior is not re-tested here. Add the new pure module(s) to the vitest coverage `include` list.
- [ ] `make check && make test` green.

## ★ Checkpoint 1

- [ ] Update `wip/adopt-form/design.md`: decisions confirmed or amended, SHAs of landed commits, deviations reconciled into the phases below. Verify the doc is cold-start ready for a fresh session.

## Phase 3 — stories and fixtures

- [ ] Extend `scripts/generate-fixtures.mjs` to capture `pipe_io_contracts`: the pipelex validation report carries them keyed by `pipe_ref` (`pipelex/pipelex/pipeline/validation_report.py`), so add a validate call per bundle on the DRY pass and write a mode-independent `pipe_io_contracts.json` next to each bundle (same lifecycle as `inputs_template.json`). Never hand-write these.
- [ ] Emit a generated fixtures module (e.g. `__stories__/pipelines/specs/_generated.contracts.ts`) from those JSON files, following the existing `_generated.*.ts` conventions, and run `make fixtures` to produce it.
- [ ] Storybook prebuilt lane (Decision D): import `@pipelex/mthds-form/theme.css` and `@pipelex/mthds-form/styles.css` in `.storybook/preview.ts`. Then check that Tailwind preflight does not visually regress the existing graph stories; if it does, scope the imports to the form stories instead and note the deviation at Checkpoint 1's update.
- [ ] `RunPanel.stories.tsx` under `src/form/react/__stories__/`: contracts covering required + optional fields, a plural input, a file field, and an enum; a running-state story; and an invalid-submit story surfacing the error summary.
- [ ] The integration story: `GraphViewer` with `onNodeSelect` → `getPipeIOContract(contracts, domain, pipeCode)` (note the argument order — the kernel README shows it wrong) → `RunPanel` beside the graph, fed by the generated contracts fixture.
- [ ] Browser play tests (`storybook/test` imports, `within(canvasElement)`): fill a required field and watch readiness flip, submit and assert the `onRun` wire payload (blank optionals omitted; empty plurals as bare `[]`), and exercise the optional-toggle fold.
- [ ] Mandatory visual verification: `make storybook` + `/browse` over the new form stories AND a spread of existing graph stories (CV screening, nested controllers, wide parallel) to confirm the preflight decision above.
- [ ] `make check && make test` green (includes the storybook vitest project).

## Phase 4 — docs and release prep

- [ ] `docs/run-form-panel.md`: the panel's contract (props, what the host injects, what the kernel owns), the CSS lanes and the silent-purge trap warning inherited from `pipelex-app/docs/form-kernel-package.md`, the `.dark` bridge, and the stable container class hook.
- [ ] README section for `./form/react`, and a cross-reference from `docs/theming.md` (panel chrome tokens vs the kernel's shadcn tokens; the deferred token-bridge open question).
- [ ] Update `CLAUDE.md`: the `src/form/` module in the project structure, the `@form/*` alias, the optional-peer + entry-point pattern, and the contracts fixture in the test-data section.
- [ ] CHANGELOG entry under `[Unreleased]` (additive: new entry point, new optional peer — a minor bump when released). No version bump now; the release rides the `/release` skill when Louis calls it.
- [ ] Final `make check && make test && make build`, then open the PR from `feature/Adopt-form` into `dev`.

## ★ Checkpoint 2 (close)

- [ ] Verify the K2 gate: a story renders a method form where every field, the readiness verdict, and the wire payload come from kernel imports, and the only local code is layout.
- [ ] Record the closure in the workspace roadmap (`../wip/devx/input-form-roadmap.md`, Track K) per the program's checkpoint protocol, and update `wip/adopt-form/design.md` one last time.
