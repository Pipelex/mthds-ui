# Changelog

## [v0.23.0] - 2026-09-04

### Changed

- **`@pipelex/mthds-form` moves to `^0.8.0`, and with it the controls' stylesheet changes what it asks of your tokens. This is breaking for a host that themes the form.** Both React entries import the kernel's prebuilt sheet themselves, so the kernel's Tailwind 4 migration arrives here whether or not your app ever names the package. A Tailwind 4 theme holds **whole colours**, so the sheet now emits `background-color: var(--background)` where it used to emit `background-color: hsl(var(--background))`. Define the shadcn tokens you override as complete colours — `hsl(240 10% 3.9%)`, `#0a0711`, `oklch(…)`, any of them — and not as the bare HSL triplets Tailwind 3 wanted.

  **Getting it wrong is silent, which is the part worth reading twice.** A leftover triplet computes to `background-color: 240 5.9% 10%`, which is not a colour, so the browser **discards** the declaration instead of overriding with it. Nothing fails: the build is green, the token is defined and inspects correctly in devtools, and the control simply falls back to `transparent` or to the initial `canvastext`. What you see is a panel with no surface colour and a white label on a pale background — which reads like a contrast bug or a broken design system, and sends you looking anywhere except at a stylesheet. Searching for a rule that sets the colour finds nothing, because the rule that wins sets it to something unparseable.

  **If your app declares `@pipelex/mthds-form` itself, the better move is to stop.** The kernel is a dependency of this package, so you get it without naming it, and a second declaration means a second copy in the tree — which breaks more than styling: the kernel ships React contexts, so `FieldStringsProvider` and `FieldPresentationProvider` mounted above the panel stop resolving inside it, and the panel reads the kernel's defaults while your app reads yours, silently. If you must keep the direct dependency because you import the kernel's own helpers, move it to `^0.8.0` in the **same commit** as this one: a caret range below 1.0 does not bridge a minor, so the two would otherwise resolve to different builds. And a git-commit pin taken to get a Tailwind 4 build ahead of its release has done its job — drop it.

  **One support note.** The Tailwind 4 sheet uses `color-mix()`, `@property` and `@layer`, none of which the previous build used at all. They are widely available, but if your support matrix reaches browsers older than roughly 2023, check the panel before shipping. `README.md` and `docs/run-form-panel.md` carry the corrected override example.

### Fixed

- **The documentation told hosts to write token overrides in exactly the form this release breaks.** `README.md` and both of `docs/run-form-panel.md` and `docs/theming.md` gave the worked example as `--primary: 142 71% 45%`, the bare triplet that now computes to something which is not a colour and is discarded. All three are corrected to complete colours, with the discard mechanism spelled out beside each. The README matters most of the three: it is the only one that ships in the npm tarball, so it is what a consumer reads on the registry page.

- **The README also carried pre-v0.20.0 styling advice that is now actively harmful.** It told hosts to add `./node_modules/@pipelex/mthds-form/dist/**/*.js` to their Tailwind globs, or to import the kernel's `theme.css` and `styles.css` themselves. Either one puts a second, unlayered copy of the kernel's utilities in the page — precisely the state the cascade layer introduced in v0.21.0 exists to prevent, and the one `src/styles/__tests__/formKernelLayer.test.ts` guards against. It now says the stylesheet ships with the package and that you add nothing.

- **Three documents still described the kernel as an optional peer, one of them contradicting itself.** `README.md` listed it in the peer-dependency table and told hosts to install it directly; `docs/run-form-panel.md` said "it is a peer, not a dependency" in its Installing section while its own later sections described a dependency; `CLAUDE.md`, the `Makefile` comments and `.claude/skills/bump-mthds-form/` said it was named twice, in `peerDependencies` and `devDependencies`. All of it stale since the kernel became an ordinary `dependency` declared once at a registry range. Declaring it yourself is now the thing to avoid, because a second declaration is a second copy and the kernel ships React contexts.

- **`make use-npm` was broken, and it deleted the kernel before failing.** It resolved the version to restore by reading `package.json`'s `devDependencies` entry, which has not existed since the kernel moved to `dependencies`, so it ran `npm install @pipelex/mthds-form@undefined` — a 404 — one line after having already removed `node_modules/@pipelex/mthds-form`. Leaving dev mode left you with no kernel at all.

- **The `/bump-mthds-form` skill's account of the contracts-fixture obligation is corrected** — that obligation has been discharged since the post-`0.3.0` adoption, and its note is kept rather than deleted, as the note itself asks.

- **No closed-source repository is named in this package any more.** A consuming application was named by name in a comment in `src/styles/form-kernel.css`, which ships as `dist/styles/form-kernel.css`, and in `src/shiki/pipelexLightTheme.ts`, which reaches consumers through the emitted `.d.ts` and the source map. Both now say "a consuming application". `CLAUDE.md` gains the rule so it stays that way; already-dated changelog entries are left as the historical record they are.

- **A second `## [Unreleased]` heading had been sitting in the middle of this changelog since v0.20.0, filing shipped work as unreleased.** The v0.20.0 cut inserted its own heading above the pending section instead of renaming it, so the `StuffViewer` deletion, the `output_form` fixtures and `findStuffByDigest` — all of which went out in v0.20.0 on 2026-09-02 — have been reading as unreleased ever since. The stray heading is removed and that content now sits under v0.20.0 where it shipped. Nothing moved between releases; only the heading that misfiled them is gone.

## [v0.22.0] - 2026-09-03

### Fixed

- **The graph's stuff panel names the STUFF, not the descriptor's root node.** Opening a data node headed its panel `output` — every result, every pipe. That is what `build_output_form` calls the root, and it is right in the artifact: the descriptor describes an output SLOT, which has no name of its own. It is wrong on screen, where the reader has just clicked a node called `report_pages` and the input panel beside it is headed `annual_report` — three surfaces naming one data item, and the middle one saying nothing. `StuffResultPanel` passes `stuff.name` through the kernel's new `StuffViewer` `name` prop. The graph is the one that knows which node was opened, so the graph is the one that says.

### Changed

- **`@pipelex/mthds-form` moves to ^0.7.0.** The release that carries the `name` prop above, and three layout fixes to the result view: a structure's values are flushed to the right edge of their column instead of trailing the label, a table's header is a filled `bg-muted` band rather than a near-invisible hairline, and the table fills its box instead of stopping mid-way. Its open-row detail also stops overhanging the scroller by the width of the chevron column — invisible while the detail's values started at the left, a clean cut through the last characters of each once they ended at the right.

## [v0.21.0] - 2026-09-03

### Fixed

- **The form kernel's stylesheet now arrives in a cascade layer, so it stops overriding the host's own Tailwind.** v0.20.0 was right that the kernel's classes are ours to ship and wrong to ship them raw. `@pipelex/mthds-form/styles.css` is a **complete** Tailwind build — preflight, plus every utility unprefixed and unscoped — and it is code-split, so it lands in the host's `<head>` *after* the host's own stylesheet the moment a graph mounts. From that instant it won every tie it had no business winning, and the failure looked nothing like a stylesheet problem:

  - Its bare `.hidden { display: none }` outranked the host's `.sm\:inline` — equal specificity, ours last — so every `class="hidden sm:inline"` label in the host app vanished at every width. In `pipelex-app` that blanked the toolbar's Deploy / Dry Run / Run labels, the deploy dialog's tab labels and the responsive separators, leaving a row of unlabelled icons that appeared and disappeared with the flowchart.
  - Its preflight `*, ::before, ::after { border: 0 solid #e5e7eb }` replaced the host's default border colour, painting a pale hairline under anything carrying a border width and no explicit colour class.

  Both React entries now import `src/styles/form-kernel.css`, which is one line — `@import "@pipelex/mthds-form/styles.css" layer(mthds-form);`. Layered rules lose to unlayered rules regardless of source order, so a host keeps every declaration it makes itself and still gets the classes it never generated. A host with no Tailwind sees no change at all: a layer only decides conflicts, and there are none to decide. `theme.css` stays out as before — those tokens belong to the host.

  **Why a layer rather than the alternatives.** Dropping the import returns to the arrangement v0.20.0 fixed, where a Tailwind host silently renders a subset of the controls. A Tailwind `prefix` renames every class in the kernel's source. An `important` selector strategy raises specificity but still emits a bare `.hidden`. The layer is the only option that changes who wins without changing a single class name.

  `src/styles/__tests__/formKernelLayer.test.ts` guards the shape against a future edit that reinstates the direct import or drops the `layer()`, and `docs/run-form-panel.md` carries the full account.

### Changed

- **Storybook takes the shipped lane.** `.storybook/preview.ts` imported `@pipelex/mthds-form/styles.css` directly, which is the raw sheet this release exists to stop shipping — so the stories were exercising a lane no consumer takes. It now imports `src/styles/form-kernel.css`, the same wrapper the React entries use. It stays an explicit import rather than an inherited one because the stories reach components by their deep paths (`@form/react/RunPanel`, `@graph/react/viewer/GraphViewer`) and never through `index.ts`, so an entry's side-effect import never runs there. `theme.css` is still imported here: this repo runs no Tailwind of its own, and Storybook is the host that owes those tokens.

- **The standalone bundle ships the kernel's utilities.** It never had them: `scripts/standaloneCssFiles.mjs` is a hand-maintained allow-list and the kernel's sheet had only ever been reached through a bare package specifier, which the manifest's regression guard does not scan for. The resolved sheet is now listed beside `@xyflow`'s, ordered with the vendor base sheets so our own component CSS keeps the last word. It goes in unlayered on purpose — a self-contained HTML has no host stylesheet to lose a tie to, and the bundle is a plain `readFileSync` concatenation that cannot resolve an `@import` anyway. `STANDALONE_CSS_ALIASES` records that the wrapper stands for the resolved file, so the guard keeps its teeth: an unmapped, unlisted CSS import still fails.

## [v0.20.0] - 2026-09-02

### Fixed

- **The form kernel's styles ship with it, so a host stops rendering a subset of them.** Both React entries now import `@pipelex/mthds-form/styles.css`. A Tailwind host is supposed to generate those utilities by scanning the kernel and no host did: content globs stop at the host's own source and `node_modules` is off the sweep, so a host got exactly the classes it happened to use elsewhere and silently missed the rest. What showed was the result grid — its column template is an arbitrary value nothing else writes, so it was never generated, the grid fell back to a plain block, and a structured result rendered as a stack of labels each above its own value instead of two aligned columns. The gap was never limited to that class, and nothing reported it.

  The host cannot fix this itself, which is why the fix is here: it does not depend on the kernel directly — that indirection is the point of the re-export — neither package exports `./package.json`, and the export entries carry no `require` condition, so both routes a Tailwind config could take to locate the kernel are closed. `./graph/react` imports it as well as `./form/react`, because `GraphViewer` is usually pulled in on its own, often through a dynamic import, with the form entry never touched. `theme.css` stays out: it defines the semantic tokens a shadcn host already owns.

### Changed

- **The bundled MTHDS JSON Schema moves to `pipelex` v0.55.0.** The copy under `data/schema/` stood at v0.43.1 and described neither the `hints` members on a concept and a structure field nor `InputSlotBlueprint` — the expanded form in which a pipe's `inputs` value may be a table, `x = { concept = "S", hints = { intent = "prose" } }`, rather than only the string `x = "S"`. Also arriving with the version: `PipeLLMBlueprint.templating_style`, and the removal of `LLMSetting.prompting_target` with its `PromptingTarget` definition, which the old copy would otherwise keep accepting after the language dropped them. This repo's refresh copies `pipelex/derived/` directly rather than pulling the hosted chain, so the copy tracks the release without waiting on the mthds site deploy; the schema taken here was verified byte-identical to the one generated at the released `v0.55.0` tag, so no unreleased blueprint shape rides along.

- **BREAKING — `@pipelex/mthds-form` is a DEPENDENCY, re-exported from `./form` and `./form/react`, and the `renderStuffData` render prop is gone.** The kernel was optional and isolated behind `./form/react`, so `./graph/react` had to keep resolving without it and `GraphViewer` took a render function instead of importing `ResultPanel`. That was right while the kernel powered only the run form — a host embedding a graph viewer need not offer a way to run methods — and it stopped being right the moment `output_form` became how the viewer shows a result **at all**. A viewer whose detail panel cannot display data is not a viewer.

  Pass the artifacts instead: `<GraphViewer graphspec contracts outputForm inputForm />`. `StuffResultPanel` moved from `./form/react` to the graph's detail panel and is exported from `./graph/react`; `renderStuffResult`, `RenderStuffData` and `StuffRenderContext` are deleted. A consumer that passes no artifacts still gets the concept's structure table and no data tab — the floor for a static graph or a spec restored without its validate report.

  **A dependency, not a peer**, and the route there is worth recording because the obvious answer failed. A _required peer_ is auto-installed by npm — `make smoke-pack` proved it — and **not by pnpm**, which reports it unmet and installs nothing even with `auto-install-peers=true`. A property that holds on one package manager is not a property a library can offer, so a host would still have had to declare the kernel itself, which is the thing this change exists to remove.

  So it is a dependency, and the objection that used to rule that out — two copies means two React context identities, and a host's `FieldStringsProvider` silently fails to resolve inside our controls — is answered by the rule that comes with it: **a consumer imports the kernel through `@pipelex/mthds-ui/form` and `…/form/react`, never directly.** A host that declares nothing cannot produce a second copy. `make smoke-pack` asserts exactly that from a bare consumer declaring only this package and React: the kernel arrives, it is a dependency rather than a peer, there is **exactly one copy** in the tree, both React entries import it rather than inlining it, and `.`, `./graph` and `./static-graph` never reach it.

- **New `./form` entry** — the kernel's React-free surface, re-exported. The mirror of the kernel's own `.` entry (descriptor vocabulary, derivation, readiness, run gate, value plumbing), importable from a server action or a worker. `./form/react` re-exports the controls the same way.

  The `no-restricted-imports` / `no-restricted-syntax` block that policed the old boundary is removed — there is no boundary left to police. `shiki` is now the only optional peer.

- **BREAKING — `StuffViewer` is deleted; the graph's data panel renders through the form kernel.** The old viewer offered three tabs (HTML, JSON, Pretty), which was an honest admission of an unanswerable question: a `GraphSpec` states a concept and a payload and nothing about what that payload IS, so it sniffed URLs, guessed MIME types from extensions and ran model-authored `data_html` through DOMPurify. The standard answers that question in artifacts built for it — `output_form` gives a pipe's result one descriptor node, and the output half of `pipe_io_contracts` gives the payload's JSON Schema beside it — so the panel now pairs them through `@pipelex/mthds-form`'s `buildResultField` and renders `ResultPanel`: a table for a list of records, a two-column grid for a structure, a gallery for images, a sandboxed frame for markup, markdown for prose. Nothing inspects the value to decide. See [docs/stuff-result-panel.md](docs/stuff-result-panel.md).

  The kernel is an **optional** peer isolated behind `./form/react`, so `GraphViewer` takes a render prop rather than importing it: `renderStuffData={renderStuffResult({ contracts, outputForm })}`, exported from `@pipelex/mthds-ui/form/react`. The graph owns the selection, the lookup and the panel; the renderer owns the view. A consumer that passes nothing gets the concept's structure table and no data tab — the deliberate floor, because a tab opening onto an empty pane reads as data that failed to load.

  Removed from `GraphViewerProps`: `resolveStorageUrl`, `canEmbedPdf`, `onOpenExternally` — all three existed solely for `StuffViewer`. `onStuffNodeClick` now receives a `GraphSpecNodeIoItem` rather than the deleted `StuffViewerData`, and `ConceptDetailPanel`'s `ioData` takes the same one shape. The `./graph/react/stuff/StuffViewer.css` export-map entry is gone, and `dompurify` has left `dependencies` — it was there only to sanitize `data_html`.

  **One capability is genuinely lost and is not replaced here.** `resolveStorageUrl` exchanged `pipelex-storage://` URIs for presigned URLs before painting media; the kernel has no equivalent seam yet, so a result carrying a storage reference shows the file named rather than rendered. That belongs in the kernel's file arms, where every consumer gets it.

### Added

- **`output_form` in the generated fixtures.** `scripts/dump_validate_views.py` now calls pipelex's `build_output_form` beside the two builders it already ran — all three from one library window, since they iterate the same loaded pipes and share one key set — and the generator writes `output_form.json` beside each pipeline's bundle and an `OUTPUT_FORM_*` export in each split module. A pipeline must carry all three files to appear in the fixture; emitting a split without a descriptor would compile and render an empty result, while dropping it fails the story that imports the missing export, loudly and by name.

- **`findStuffByDigest` / `pipeRefOf`** (`@pipelex/mthds-ui/graph`) — the walk from a data item back to the pipe that produced it, which is the join both result artifacts are keyed by. Two passes, and the order is load-bearing: the same digest appears on the producer's `outputs` and on every consumer's `inputs`, and only the producer's copy is guaranteed to carry the payload. It also reports the first pipe that CONSUMES the item, which is the fallback identity for a method's own inputs.

- **A method's own inputs render too.** They have no producing pipe, so no output descriptor describes them — but the CONSUMING pipe's `input_form` entry for their slot does: the same field, seen from the other side. Pass `inputForm` alongside the other two to `renderStuffResult` and the top of a graph shows what the run was actually given. **Single-valued slots only**, and that is a correctness boundary rather than caution: an input's `json_schema` describes what a caller SENDS, so a plural slot's is a bare array, while a stuff's payload is what the runtime HOLDS, which for a plural value is a `ListContent {items}` envelope. On the single arm the two are byte-identical by construction; on the plural arm they provably disagree, so the fallback declines.

- **Every per-pipeline graph story shows its run's data.** All 34 `Graph - from run/NN …` stories now pass `renderStuffData`, wired through `stuffRendererFor(name)` and the generated `ARTIFACT_SETS` map — so clicking a data node in any of them shows what that step produced, or what the method was given, rather than a schema table. (`26 Wide Parallel` and `27 Wide Batch` are the exceptions and correctly so: their specs are built by generators, not by a bundle, so there are no artifacts to describe them.)

- **`RenderStuffData` / `StuffRenderContext`** (`@pipelex/mthds-ui/graph/react`) — the seam's types, for a host rendering stuff data its own way.

## [v0.19.0] - 2026-08-29

### Added

- **`idPrefix` prop on `RunPanel`**: New optional prop that explicitly namespaces control DOM ids, for when something outside the panel must address a control — `getElementById`, a deep link that focuses a field, an end-to-end selector. Unset, the prefix comes from `useId`; `""` writes the bare path ids back.
- **`input_form` fixtures**: `make fixtures-contracts` now generates and exports `input_form` descriptors alongside `pipe_io_contracts`, and both views are required to render the form fixtures — a pipeline carrying only one is skipped rather than half-emitted.

### Changed

- **`RunPanel` requires a `descriptor` prop**: `RunPanel` now requires the `input_form` `descriptor` prop in addition to `contract`. Form derivation is driven by that descriptor (field kinds, constraints, presence, and authored order), with the contract co-walked beside it; the kernel's old concept-name and schema-shape heuristics are gone. Both artifacts come from one `/validate` call — ask for `views: ["pipe_io_contracts", "input_form"]`. Required rather than optional because omitting it silently renders an empty form. (Breaking)
- **Bumped `@pipelex/mthds-form` to `0.5.0`**: Upgraded the core form kernel dependency, in both the peer range and the dev range. Below 1.0 a caret range does not bridge a minor, so hosts pinned to `^0.4.0` must bump too. (Breaking)
- **Wire-visible native types**: `native.Date` and `native.Html` now travel as their declared content models rather than falling back to prose — `native.Date` is an object over `DateContent { date, time }`, not `{ text }`. A concept refining `native.Text` is unchanged. If you persist run inputs, values captured before this bump are in the old shape.
- **`mthds` peer dependency**: Hosts of `./form/react` now install `mthds` as well — the kernel declares it a required peer (`^0.24.0`) and re-exports its protocol types, so a package manager with peer auto-installation adds it for you. This library neither imports nor re-declares it, and graph-only consumers are unaffected.
- **Fixture generation scripts**: Renamed `scripts/dump_pipe_io_contracts.py` to `scripts/dump_validate_views.py`; it now dumps both `pipe_io_contracts` and `input_form` from a single library window, so the two share one key set.
- **Documentation**: Updated `docs/run-form-panel.md` and `CLAUDE.md` for the new `descriptor` requirement, `idPrefix` behavior, and the renamed fixture script.

### Fixed

- **DOM id collisions across several `RunPanel`s**: A control's DOM id used to be the field's dotted path verbatim — unique within a form but not within a document — so two panels sharing an input name emitted duplicate ids (`id="match.score"`) and each `<label for>` bound to the first. The kernel now namespaces control ids and the panel scopes one prefix around its own form, restoring click-to-focus without touching the underlying value paths.

## [v0.18.0] - 2026-08-25

### Added

- **New `RunPanel` component** — Added the `@pipelex/mthds-ui/form/react` entry point exporting `RunPanel`, which renders a pipe's input form from its IO contract (field rendering, readiness gating, wire-ready payload generation) without executing the run. See `docs/run-form-panel.md`.
- **Optional form kernel** — Added `@pipelex/mthds-form` as an optional peer dependency. Graph-only consumers install nothing extra; form consumers install the kernel. Import isolation is enforced via ESLint to prevent bundle leakage.
- **Vendored MTHDS Test Corpus** — Added a read-only, byte-identical copy of the canonical MTHDS Test Corpus (`data/mthds-corpus/`) for cross-language conformance testing of the static graph builder.
- **Contracts fixture generation** — Added `make fixtures-contracts` to generate `pipe_io_contracts` fixtures offline, without full pipeline inference.
- **New developer commands** — Added `make smoke-pack` to verify the built tarball from a bare consumer's perspective, and `make use-local` / `make use-npm` to swap between local and published builds of the form kernel.
- **`bump-mthds-form` Claude skill** — Added a skill that automates and guides updating the form kernel dependency.
- **Documentation** — Added `docs/run-form-panel.md` for the new panel, plus static-graph multi-file package and theming notes.

### Changed

- Bumped `@pipelex/mthds-form` to `0.4.0` in both the peer and dev ranges; hosts using the form panel must update their kernel version to satisfy the caret range. (Breaking)
- **S2 contracts reshape** — Updated `pipe_io_contracts` fixtures to the new S2 wire format: the boolean `optional` flag is replaced by a three-valued `presence` marker, `multiplicity` gained a `fixed` arm, and `item_count` was added. (Breaking)
- **Unified submit validation** — The submit path now uses the kernel's `gateRunInputs`, so the Run button and the programmatic submit gate enforce identical validation rules (e.g. catching blank required text inputs).
- **Reduced browser bundle size** — The `ajv` validator is no longer shipped to the browser for hosts rendering the panel.
- **Corpus sync** — Synced the vendored MTHDS corpus to `pipelex` v0.51.0, adding invalid entries for negative testing and `fails_at` tags. The sweeps read each entry's `validity` and take only the valid ones.
- **Improved form gating** — Fixed-count list inputs (`Concept[N]`) now gate the Run button until the exact count is met, and required structured inputs must be interacted with before the Run button enables.
- **Better form controls, via the kernel bump** — An optional structured input stays absent until touched, `native.Number` travels inside its declared envelope, `native.YesNo` renders as a switch, a number's declared `minimum` / `maximum` reach the stepper, and a blocked run names the field the method wrote rather than the title pydantic gave it.
- **Storybook styling** — Storybook now uses the form kernel's prebuilt styling lane (`theme.css` + `styles.css`) to accurately test the default Tailwind preflight environment.
- **Shared fixture discovery** — Fixture generation scripts now use a shared discovery helper to sweep the local pipelines and the vendored corpus together.
- **Prop documentation** — `RunPanel`'s `env` prop now documents that `uploadingIds` unions with the panel's own set rather than overriding it, and `running` documents that a host must set it synchronously inside `onRun`.

### Fixed

- **Startup crash** — Updated `uri_format` in `.pipelex/pipelex.toml` to `{hash}.{extension}` to fix initialization failures with `pipelex` 0.51.0.
- **Contracts dump data loss** — Fixed the Python contracts dump script dropping the `item_count` field by removing `exclude_none=True`.
- **Error summary translation** — The host's `translate` function now receives the entire error summary instead of a subset of error routes.
- **UI state bugs** — Optional inputs no longer disappear from the UI when cleared, and `env.disabled` now disables the Run button in addition to the form fields.
- **Duplicate runs** — Fixed a race where two `requestSubmit()` calls in the same synchronous block started duplicate runs; a submit that passes the gate is now latched until the end of the current task.
- **Accessibility** — Fixed the Run button label contrast to meet WCAG AA in both light and dark themes.
- **Native validation veto** — Added `noValidate` to the panel's `<form>` so a decimal in a number field no longer silently vetoes submission.
- **Upload tracking** — The host's `uploadingIds` now joins the panel's internal tracking set instead of replacing it, so an in-flight upload the panel started can no longer be hidden.
- **Run gate hardening, via the kernel bump** — A deeply nested value no longer overflows the stack (the emptiness walk stops at a depth cap, which guards cycles at the same time), a request body that is not an object is refused rather than repaired into `{}` and accepted, and an input whose name collides with `Object.prototype` is read correctly.
- **Packaging & tooling** — The packaging smoke test now catches missing CSS imports and `"use client"` directives; the isolation guards catch a dynamic `import()` of the form kernel; the standalone CSS manifest guard works on Windows and in both directions; partial fixture generation (`--only`) no longer re-sources the vendored corpus entries; and each fixture generator mode demands exactly the executable it invokes (CLI vs. Python venv).
- **Static graph builder** — The concept reference parser handles optional (`?`) and force (`!`) presence markers; the fixture sweep fails on any diagnostic, including warnings; multi-file bundle merging lets a concrete pipe definition override a forward declaration, reporting `signature-type-mismatch` when the two disagree; and `refines` now refuses multiplicity and presence suffixes.
- **Syntax highlighting** — Fixed the MTHDS Shiki grammar to highlight presence markers.

## [v0.17.0] - 2026-08-14

### Added

- **The detail panel now shows the model that actually ran, not just the one that was requested.** A GraphSpec names a model at three rungs of one ladder — the authored choice (`$writing-factual`), the handle the pipe resolved to (`@default-premium`, frequently still an alias because aliases resolve at inference time), and the model that actually served the call. The panel showed the middle rung under a label promising the bottom one, so the same `Model` row read `claude-4.6-sonnet` on one node and `@default-premium` on another with nothing to distinguish them. pipelex now carries the real thing on `usage.by_model`, and `ModelRows` shows it as `Model`, adding a `Requested` row only when the handle differs — no duplicate row when a pipe named its model directly. A node that used several models (a `PipeLLM`'s text pass and object pass resolve separately) gets a row each with its call count. A dry or static graph, having nothing to report, falls back to the requested handle. `validateGraphSpec` normalizes an absent `by_model` to `[]` so specs generated before per-model attribution still load, while still rejecting a malformed one.

- **Per-node cost in the side panel.** pipelex now attributes each inference call to the graph node that made it, so `node.usage` and `spec.usage` come down with every run graph; this renders them. Clicking a card shows the cost on the status line, beside the duration and formatted like it — `● Succeeded  23.57s  $0.0138` — since those are three facts of the same kind about the same run. A thin chevron expands the diagnostics behind it: call counts, priced-call counts, total tokens, the per-category breakdown, and the node's own figures alongside its branch's. Nothing about cost appears on the graph cards themselves; the card is for structure. A controller runs no inference of its own, so it reports its `subtree_*` half — the rollup pipelex computes once, so no consumer re-derives it and disagrees.

  The design refuses three things, each of which would state something false about money: `cost: null` is never rendered as `$0.00` (it means nothing was priced, not that it was free); a node whose calls were only partly rated renders `≥ $0.0043`, because its cost is a lower bound; and a **dry run shows nothing at all** — it executes nothing, so its usage counts are simulated and presenting them as measurements would be a fabrication. Where there is no price the panel shows nothing rather than a `0` or a `—`, each of which would imply something. Cost therefore appears only on a real run.

  **No token counts are rendered anywhere**, which is also deliberate: extract, search and image generation are billed per request, and pipelex encodes that price by putting exactly `1_000_000` in each token category (rates are per-million, so the arithmetic reproduces the per-request price). A one-page extract reports 2,000,000 "tokens" — a scaled request counter, not a measurement — and a controller's subtree total sums those sentinels with real LLM tokens, so no token figure is trustworthy at any level of a graph. `cost` is the number that survives the encoding. `validateGraphSpec` gates the field at the boundary (`cost` must be `number | null`, counts must be present rather than defaulted to zero): types alone are a compile-time fiction, and a malformed usage would otherwise flow through as trusted data and be rendered as a price. See `docs/usage-attribution.md`.

- **The whole LIVE fixture corpus was regenerated against real models, so every `Live Run` story now shows real prices.** All 32 pipelines, $2.85 of inference. Live output is not reproducible — a model's content differs run to run — so five snapshot fingerprints shifted: four were pure relabeling (parallel branches numbered in the opposite order), and `RFP_QUALIFIER` genuinely changed shape, its `assess_single_requirement` batch fanning out over 30 requirements where the previous run's model extracted 46. Node and edge counts were checked against the previous fixtures before re-baselining, since a changed count is a content difference rather than relabeling.

- **The DRY fixture corpus records what a dry run really did: no cost, no tokens.** `scripts/generate-fixtures.mjs` deliberately does **not** pass `--mock-usage` — that flag makes a dry run report invented token counts, and a fabricated number on screen is the same class of error as a fabricated price. A DRY spec now carries usage objects with zero tokens and a null cost, which is the truth about a dry run. `assertValid` gains a matching gate on freshly generated specs — graph usage present, every node carrying a usage object, an empty `unattributed` bucket, all-null DRY costs, and each CONTAINS parent's subtree covering its children's — so an attribution that half-lands fails loudly instead of silently emptying the fixtures. There is deliberately no token assertion: zero tokens is the correct result, not a symptom. Specs reused from disk are exempt from the gate, since they may predate usage attribution and a partial `--only` run must still work against an older corpus.

### Changed

- **A pipeline directory now holds exactly what the current pipelex CLI emits, and `generate-fixtures.mjs` is its only writer.** The directories had accumulated a second, older generation of artifacts — `live_run.html`, `dry_run.json`, `live_run.json`, `input_schema.json`, an unprefixed `mermaidflow.mmd` — written by a script that no longer exists, from a `mthds-wip/` layout this repo has not had for months. They were dated April, present on some pipelines and absent on others (26 through 34 had none at all), referenced by nothing, and their ReactFlow HTML still loaded React from unpkg rather than the pinned `@pipelex/mthds-ui` bundle the CLI ships today. Nothing regenerated them, so they could only rot.

  The generator now writes the whole set, uniformly, from the same run that produces the spec: `<mode>_run_graph.html` (the standalone viewer), `<mode>_run_mermaidflow.mmd` / `.html`, `live_run_main_stuff.json`, and an `inputs_template.json` projected offline on the free DRY pass. Renders are copied only after the spec passes `assertValid`, so a rejected spec never leaves a refreshed render beside it, and a missing CLI output fails loudly rather than committing a pipeline with half its renders. A dry run's main stuff is deliberately not committed — it is the string `--mock-inputs` invented, so it would be diff churn carrying no information. The new HTML is an order of magnitude smaller (~10KB against ~93KB) because the viewer is fetched from jsDelivr under SRI instead of bundled.

  Three more dead things went with them. `all_graphspecs.json` and `all_graphspecs_with_io.json` were April-era aggregate dumps of the whole corpus, shaped `{pipeline_NN: {nodes, edges}}` with no `meta` block at all — they predate the `meta.format` / `meta.mode` contract, so `validateGraphSpec` would reject every entry, and nothing in the repo read them. Six PDFs under `pipeline_26/.pipelex/storage/normalized/` were run detritus committed before `.pipelex/storage/` was gitignored: `inputs.json` references `inputs/*.pdf` directly and never a `pipelex-storage://` URI, and a regenerated run writes storage to the repo-root `.pipelex/` instead, so nothing had touched them since April.

  `bundle.mthds`, `inputs.json`, `inputs/`, `structures/` and `shared_inputs/` are now the only authored files under `data/pipelines/`.

- **The whole corpus was regenerated against pipelex 0.43.1 — DRY and LIVE, all 32 pipelines, $2.82 of inference over 159 calls.** The LIVE half ran per-pipeline rather than as one sweep, so no failure could leave the half-swept mixed-version tree `wip/fixtures-live-corpus-regeneration.md` describes; all 32 succeeded. Live specs now carry the per-model attribution and the input/output cost split (`claude-4.6-sonnet`, `claude-4.8-opus`, `azure-document-intelligence`, `linkup-standard`, `nano-banana`), which is what the `Model` row and the cost line render.

  Live output is not reproducible, so three LIVE fingerprints shifted. `CV_BATCH_SCREENING` was pure relabeling — identical node and edge counts. The other two changed shape because a model extracted a different number of items from an unchanged input: `RFP_QUALIFIER` fanned out over 30 requirements against 31, and `BATCH_WITH_INNER_SEQ` over 3 records against 11. Counts were checked per pipe code before re-baselining, and both remained internally consistent across the batch's inner sequence.

- **The bundled MTHDS JSON Schema is refreshed to pipelex v0.43.1.** Only the generator's version stamp moved — the authoring surface `src/static-graph/` parses against is byte-identical between 0.41.0 and 0.43.1, so this confirms rather than corrects the reference contract.

- **The repo-local `.pipelex/` was four months stale and is refreshed from the pipelex kit.** Its model deck was generated 2026-04-28 and still named models that no longer exist (`gemini-3.0-pro`, `claude-4.7-opus` as `best-claude` and every `default-premium`), so fixture generation resolved aliases against a catalog the gateway had moved past. The config file also predated `is_generate_usage`, `max_concurrency`, `secrets_config` and `plugins`. Refreshed `pipelex.toml`, `telemetry.toml`, `plxt.toml`, `pipelex_service.toml`, the backend model catalogs and the deck (via `pipelex update`), keeping the one deliberate local delta: only `pipelex_gateway` and `internal` are enabled, since this repo has no BYOK credentials and runs fixtures through the gateway.

## [v0.16.0] - 2026-08-11

### Added

- **The `YesNo`, `Date`, and `Time` natives now have real fixture coverage.** They were taught to the static graph in the previous entry, but the only bundle using them was an inline Storybook string — invisible to every fixture-driven sweep in the repo, and not runnable by pipelex (its prompts put an `@ref` inline, which the runtime rejects). Three bundles in `data/pipelines/` replace it, so the three sweeps that auto-discover `pipeline_*` pick them up with no wiring: `parseFixtureBundles` (parses with no error diagnostics), `buildFixtureGraphs` (builds a `validateGraphSpec`-clean static spec, deterministically), and `parity` (static topology matches pipelex's own dry-run spec).
  - `pipeline_32` **Meeting Triage** — `Date[]`, `Time`, and a bare `YesNo` as stuff nodes, plus a local concept refining a native: the four resolution paths the catalog fix touched, in one graph. Replaces the inline `NATIVE_CONCEPTS_BUNDLE`; the `NativeConcepts` story now renders it.
  - `pipeline_33` **Availability Routing** — the natives where the graph machinery works on them: `batch_over` a native `Date[]` driving a `PipeBatch` fan-out with per-item stuff, and a `PipeCondition` branching on a native's structure field (`urgent.yes_no`). Parity holds for both, with no accepted divergences.
  - `pipeline_34` **All Native Concepts** — one `PipeLLM` per remaining native output (`Number`, `Html`, `TextAndImages`, `JSON`).
- **A corpus oracle for the native catalog, which narrows the upstream-addition gap.** `src/static-graph/__tests__/nativeConceptsCorpus.test.ts` sweeps every `data/pipelines/*/dry_run_graph_spec.json` — pipelex output, not something this repo authored — and asserts each `concept_registry` entry with `domain_code === "native"` against the catalog: the code is one the catalog knows, and its description and structure class name match exactly. A native pipelex emits **into the corpus** that our catalog lacks now fails a test, which `docs/static-graph.md` previously stated no in-repo test could detect. The scope is exactly that: a dry spec's registry holds the concepts that spec references, not every native pipelex knows, so a new native no bundle uses is still invisible and remains a job for tooling outside this repo. Coverage is every catalog code except `Dynamic`, which has no authorable output position; the set of codes the corpus reaches is written out explicitly so deleting a fixture fails rather than silently emptying the oracle. It fails in a confusing place — regenerating fixtures breaks a native-concepts unit test — so it carries a failure guide pointing at the catalog.

- **`pipeline_32` and `pipeline_33` now carry real LIVE fixtures.** They shipped with placeholder LIVE specs (the DRY spec re-tagged, the only two in the repo) because a `PipeLLM` outputting `Date`, `Date[]`, or `Time` failed pydantic validation on every real model response. That was an upstream bug — a `mode="before"` field validator forfeited pydantic's strict-JSON acceptance of ISO strings, and instructor validates structured output in strict mode — fixed in [pipelex#1089](https://github.com/Pipelex/pipelex/pull/1089). Both bundles were regenerated with `make fixtures-live ONLY=…`, so the `StaticVsLive` and per-pipeline `LiveRun` stories now compare against real inference, and `pipeline_33`'s batch fans out over live-produced dates. `make fixtures-live ONLY=pipeline_32` is the standing end-to-end check that the temporal natives survive a live run.

- **Smoke stories for the whole DRY catalog, and a guard so it stays that way.** `PipelineSmoke.stories.tsx` renders each fixture through `GraphViewer` in a browser and asserts nodes appear, but it is hand-written (Storybook indexes static exports, so the stories cannot be generated in a loop) and had drifted: pipelines 26, 28, 30 and 31 were each added to the catalog without a smoke story, across four separate changes, with nothing to notice. The four are added, and `fixturesConsistency.test.ts` now fails — naming the missing key — when a catalog entry has no smoke story.

### Changed

- **`scripts/generate-fixtures.mjs` derives each barrel from the split modules on disk.** Previously the barrel was written from the specs a given invocation happened to assemble, so a partial run (`--only`) that omitted any pipeline — one with no on-disk spec for that mode — silently dropped its export and broke typecheck. It became reachable when `pipeline_32`/`33` shipped without a `live_run_graph_spec.json` (they have real LIVE fixtures now, per the entry above); the fix is general and holds for any partial run. The LIVE placeholder bootstrap now also runs for partial runs (a new pipeline's story could not otherwise resolve its LIVE import), and the LIVE barrel is rewritten unconditionally on a DRY run — it is derived from disk, so it is idempotent and self-heals a barrel left stale by an earlier partial run. Split writes stay `existsSync`-guarded, so real LIVE data is never clobbered.

- **`make fixtures-live` is now documented as an `ONLY=`-only command.** A full-corpus live run rewrites each spec as it goes and has no skip path, so it sweeps every fixture onto whatever pipelex the local CLI happens to be, inside whatever change is in flight, and any single failure — network, quota, a model that will not produce a given output shape — aborts partway and leaves a half-swept, mixed-version tree. `make fixtures-live-missing` is the recovery, and only when the failure was transient. The caution now lives where it is read: a comment on the target in the `Makefile`, and both the regeneration section and the command table in `CLAUDE.md`. It is a convention, not a guard — the target still runs without `ONLY=`, so the argument is the contributor's to remember.

- **`PipeParallelBlueprint.combined_output` is now optional (breaking for anyone constructing the type by hand).** pipelex 0.41.0 removed the field — a parallel always combines now — so it is absent from every registry dump; it was declared **required** here, the same defect as `templating_style` below. Made optional rather than removed because, unlike `templating_style`, it is still read: `buildStaticGraphSpec` uses it to name the combined stuff and `PipeParallelDetail` renders it, so the static builder keeps honoring it as a legacy authoring key. Whether it should keep doing so now that the bundled schema rejects the key is still open. No fixture regeneration is pending — the committed corpus never carried it.

- **Updated the bundled MTHDS JSON Schema to pipelex v0.41.0.** The schema is generated from the pipelex blueprint models and gitignored there, so drift never shows up in a PR — this copy had fallen behind. Concept structure field types gain `datetime` and `time`: a `.mthds` declaring either was **valid at runtime but rejected by this copy**, which is the user-visible half of the drift. This copy was further behind than the other consumers' and also drops two members the language has since removed: `PipeParallelBlueprint.combined_output` and the `type` key on `PipeSignatureBlueprint` — a stale copy keeps accepting both. Refreshed from the released `pipelex` v0.41.0 tree via the same direct copy `make schema-refresh` performs (this consumer reads `pipelex/derived` directly and does not depend on the S3/`mthds.ai` release chain, which is still serving v0.27.0).

- **`PipeLLMBlueprint.llm_prompt_spec` drops `templating_style` (breaking for anyone constructing the type by hand).** pipelex 0.41.0 removed the field from `LLMPromptBlueprint`: it existed as a cache for a derived value, and the style now travels as a `make_llm_prompt` parameter instead, so the key is simply absent from every PipeLLM dump — graph specs included — run or no run. It was declared **required** here, so a spec generated by 0.41.0 no longer satisfies the type. No component ever read it. `normalizePipe` stops emitting it too.
  - **`TemplateBlueprint.templating_style` is unchanged** and stays declared — nested prompt blueprints, compose and img-gen still carry it. Only the spec-level key on PipeLLM is gone; the two are easy to confuse when grepping.
  - The pre-0.41 graph-spec fixtures under `data/pipelines/` and their `_generated` story specs still carry `"templating_style": null` at the spec level. They are harmless — the generated `.ts` specs are cast `as unknown as GraphSpec`, so no excess-property check applies — and each drops the key when it is next regenerated. `pipeline_32`/`33`/`34`, generated against 0.41.0, already lack it, which is what the corpus looks like once swept.

### Deprecated

- **The `type = "PipeSignature"` tag on a signature block is retired.** Omitting the type _is_ the signature, and that is the only spelling pipelex 0.41.0 accepts — it removed `PipeSignature` from the blueprint `type` discriminator, so a bundle still carrying the tag no longer loads there. This renderer keeps accepting it, because rejecting it would blank the graph for anyone mid-migration (see the type-less `PipeSignature` fix below for what that hole looks like). It now surfaces as a warning diagnostic instead: a new `retired-signature-tag` member on the exported `DiagnosticCode` union, carrying pipelex's own migration wording, so a host that renders diagnostics tells the author to drop the key. Drop it — the tolerance is a migration ramp, not a supported spelling.

### Fixed

- **The dry-run concept panel no longer hides optional schema fields.** `ConceptDetailPanel` filtered its structure table down to required fields whenever `isDryRun` was set. In dry mode that table is the _only_ view — the panel suppresses fabricated payloads, so there is no Data tab and nothing else to read — which made the filter land on a concept description and misreport the concept: `native.Date` is pinned as `date` + optional `time`, and the dry panel asserted date-only. It also made the `req` badge column vacuous, since every surviving row was required by construction. All fields render in dry mode now, badges included; suppressing fabricated dry-run data is untouched and stays. Non-dry rendering is unchanged (it never filtered).

- **The static graph now knows the `YesNo`, `Date`, and `Time` native concepts.** The catalog in `conceptRefs.ts` mirrors the standard's pinned native set by hand, and those three codes were never added — so a `.mthds` typing an input or output as `YesNo`, `Date`, or `Time` had it resolved as an ordinary concept of the authoring domain: the detail panel showed a **blank description and the wrong domain**, the structure class name was the synthetic `<domain>__YesNo` instead of `YesNoContent`, and `refines = "YesNo"` qualified to `<domain>.YesNo` — a refinement chain pointing at a concept that does not exist. Nothing threw; the codes were always valid MTHDS, the renderer just did not know them. All three now resolve into the `native` domain whether written bare or qualified (`native.Date`), with or without a multiplicity suffix.
  - The rest of the catalog's descriptions are now copied verbatim from the pinned set too (`Dynamic`, `TextAndImages`, `Page`, `JSON`, `SearchResult`, `Composite` had drifted into paraphrases). The wording is display-only, so this changes what a detail panel reads, nothing structural.
  - A new test pins the expected code list, so editing the catalog is a deliberate two-place change rather than a silent one. It cannot detect an upstream addition on its own — both lists live here, and nothing this repo diffs enumerates the native codes, which is why the drift went unseen in the first place. See `docs/static-graph.md` → "Native Concepts".
  - Also fixes the structure schema `parseMthdsBundle` derives for a concept, stale against the same release: `time` and `datetime` field types were missing from the mapping entirely and fell through to an untyped string, and `date` still carried `format: "date-time"` from before `datetime` existed as its own type. Squarely the natives' business — `native.Date`'s pinned structure is `date` + `time`, and `native.Time`'s is `time`. This corrects the `json_schema` a static `GraphSpec` hands to hosts; it changes nothing on screen in this repo, because `ConceptDetailPanel`'s type column reads `type` and ignores `format` (along with `enum`, `items`, and `default` — a separate gap, still open).

- **The static graph now recognizes a type-less `PipeSignature`, the only spelling pipelex 0.41.0 accepts.** A signature has no `type` in `.mthds` — omitting the type _is_ the signature — but `normalizePipe` still required a `type` from the known-classes set, so it reported `unknown-pipe-type` and dropped the pipe. The step that called it then failed to resolve and **vanished from the graph entirely**, edges included: a hole plus two panel errors, on exactly the half-written methods the static graph exists to render. The retired `type = "PipeSignature"` spelling still renders, now with a warning — see Deprecated above. `signature_for = "PipeSignature"` is dropped to `null`, matching pipelex's `PipeType`, which no longer has that member.
  - `KNOWN_PIPE_TYPES` keeps `PipeSignature`: the GraphSpec `pipe_type` / `pipe_registry` surface genuinely does carry it (the _runtime_ `PipeSignature` serializes its tag normally; only the _blueprint_ excludes it). The two surfaces disagree from 0.41.0 on, so the authored-surface split now lives in `normalizePipe`, its only reader.

## [v0.15.0] - 2026-07-21

### Changed

- **Validation targeting is now domain-qualified: `ValidationIssue.pipeRef` replaces `pipeCode` (breaking).** Node decorations identify pipes the way the pipelex runtime does — by fully-qualified pipe ref (`domain_code.pipe_code`) — never by bare code. In a bundle where two domains declare the same pipe code, a bare-code match rang every same-code node; the matcher now compares `issue.pipeRef` against each node's `domain_code`/`pipe_code` pair, and a node missing either field is never matched. An emitter that cannot qualify a bare code must leave the issue untargeted (panel-only) rather than decorate by guess. `nodeId` targeting and its precedence are unchanged. New `makePipeRef` / `parsePipeRef` helpers (exported from the root and the `static-graph` entry point) mirror pipelex's `QualifiedRef` semantics — last-dot split, malformed dot-forms rejected, cross-package `alias->…` refs opaque — so hosts consume the canonical parsing instead of re-implementing it.

### Added

- **`Diagnostic.domain_code` — the declaring bundle's domain on every static diagnostic (additive).** `parseMthdsBundle` stamps each file's diagnostics with that file's namespace domain (`UNKNOWN_DOMAIN` when the bundle declares none), `mergeBundles` and the static walk stamp theirs with the namespace being processed, and entry selection stamps the diagnostics it can attribute (a missing or unresolvable `main_pipe` names its declaring domain); only genuinely ownerless diagnostics stay unstamped (unparseable TOML, or entry selection with no resolvable owner). This is the file identity `staticDiagnosticsToValidationIssues` needs to qualify a `pipe.<code>` locator into a `pipeRef` — and the hook hosts need to resolve a diagnostic to its declaring file when pipe codes collide across domains.

## [v0.14.0] - 2026-07-17

### Added

- **Validation node decorations.** Targeted `ValidationIssue`s now decorate the graph nodes they concern — same `validationIssues` prop as the toolbar widget, no extra wiring. `ValidationIssue` gains optional targeting fields: `pipeCode` (decorates every rendered invocation of that pipe) and `nodeId` (one precise invocation; wins when both are set); issues with neither stay panel-only, and unresolvable targets (e.g. pipes skipped during the static walk) are silently panel-only too. Decorated pipe cards and controller groups render a severity ring (outline — layout-neutral, so a verdict flip never re-runs layout or resets the viewport) plus a corner count badge whose tooltip lists each issue's message and `Fix:` line; worst severity wins per node. Folding rolls issues up: a folded controller's badge aggregates its hidden descendants' issues, so folding never hides an error. `staticDiagnosticsToValidationIssues` auto-fills the targeting fields from diagnostic paths, so static diagnostics decorate the graph for free. New pure helpers exported from the root: `buildValidationDecorations`, `applyValidationDecorations`, `resolveIssueTargetNodeId`, `NodeValidationSummary`. See `docs/validation-widget.md`.
- **Validation navigation, both directions.** Clicking an issue row in the validation panel still fires `onValidationIssueClick` (host source-jump) and now also pans the viewport to the issue's target node with a temporary flash halo; clicking a node's count badge opens the validation panel. The dropdown open state moved from `GraphToolbar` into `GraphViewer` to make the latter possible (`GraphToolbar` gains controlled `validationOpen` / `onValidationOpenChange` props — breaking for direct `GraphToolbar` consumers).

## [v0.13.0] - 2026-07-17

### Added

- **Static method-graph parser (new `@pipelex/mthds-ui/static-graph` entry point).** A pure-TypeScript, React-free module that parses raw `.mthds` TOML text into blueprint-shaped bundles: `parseMthdsBundle(tomlText)` (smol-toml parse + lenient narrowing that never throws — uninterpretable content becomes diagnostics) and `mergeBundles(bundles)` (per-domain namespace merge with keep-first duplicate handling and cross-file concept enrichment). Parsed pipes normalize to the existing `PipeBlueprintUnion` registry shapes and concepts to `ConceptInfo` (with a best-effort derived `json_schema`), so parsed entries can feed a GraphSpec `pipe_registry` / `concept_registry` directly. First phase of the static graph builder (see `wip/static-graph-design.md`); the authoring-surface schema is checked in under `data/schema/mthds_schema.json` (`make schema-refresh`).
- **Static↔dry parity harness.** A permanent Python↔TS drift detector: a vitest suite builds every fixture bundle statically and compares it against the checked-in pipelex dry-run GraphSpec, normalized to a canonical structural form (containment-path node identity, dry batch fan-out collapsed to one branch, runtime fields stripped) and compared over exactly what the renderer consumes — node multiset, containment tree, and the per-stuff producer/consumer relation derived with `buildDataflowAnalysis`. Every fixture pipeline matches with an empty allowlist; the harness's own sensitivity is tested so it cannot pass vacuously.
- **Toolbar validation widget (opt-in, hidden by default).** `GraphViewer` gains `validationState` / `validationIssues` / `onValidationIssueClick` props: when a host passes a `validationState` (`validating` | `valid` | `invalid` | `error`, new `VALIDATION_STATE` const + `ValidationState` / `ValidationIssue` types), the toolbar renders a status widget as its first section — spinner while validating, green check when valid, red cross with an issue-count badge when invalid, warning triangle when no verdict could be produced. Clicking it opens a dropdown (`ValidationPanel`, also exported with its pure helpers `validationLabel` / `validationPanelPlacement`) listing the issues — severity, locator chip, message, suggested fix, owning file — with row clicks forwarded to the host for source navigation; the dropdown placement derives from the toolbar anchor so it always unfolds toward the graph. The widget is presentation-only: the host owns the validation lifecycle and the issue list (e.g. the VS Code extension renders the static graph instantly, then drives `validating → valid | invalid | error` from `pipelex-agent validate`). A new `staticDiagnosticsToValidationIssues` helper on the `static-graph` entry point projects static-analysis diagnostics onto the same panel shape. See `docs/validation-widget.md`.
- **Static graph builder: `.mthds` TOML → renderable GraphSpec, no Python anywhere.** `buildStaticGraphSpec(mergedSet)` and `buildStaticGraphSpecFromToml(tomlText | tomlText[])` (both on the `static-graph` entry point) walk the parsed method statically — pipe invocations, scope-based input binding with dotted-prefix matching, controller recursion (sequence / parallel / condition / batch, including inline `batch_over` steps materialized as synthetic PipeBatch nodes like the runtime does) — and emit a `GraphSpec` with `meta.mode: "static"` that the existing `GraphViewer` renders unchanged. Identity is fully deterministic: invocation-path node ids, raw-string stuff digests, `static:`-namespaced edge ids. Best-effort by design: unresolvable refs are skipped with diagnostics, cycles render as leaves, `alias->…` dependency refs render as opaque signature cards, and half-written bundles still produce a graph. Every fixture bundle builds a validator-clean spec (sweep-tested).

### Changed

- **Static walk semantics aligned with the pipelex runtime** (driven by the parity harness, all verified against dry-run fixtures): working memory is one flat namespace — results produced inside a nested sub-sequence are now visible to later steps of ancestor sequences (parallel/batch branches still fork a copy); condition outcome children all carry the invoking step's `result` as their output stuff name; condition outcomes routing to the same target pipe (including `default_outcome`) merge into a single child node whose `tags.outcome` and `contains`-edge label carry all routing values; controllers expose transparent outputs on their io under the invoking slot name while the producing leaf keeps its local name.
- **Repo-local `.pipelex/pipelex.toml` updated for pipelex 0.36.x:** stripped config sections the current CLI rejects (`temporal`, `cogt.tenacity_config`, `pipelex.tracing_config.temporal_dynamodb`) so fixture generation runs again. Note: the fixture corpus itself remains pinned to the pre-0.36 pipelex generation — regenerating it is a separate task because PipeParallel semantics changed upstream (`combined_output` was deleted; parallels now always combine).

### Fixed

- **`PipeExtractBlueprint.document_stuff_name` is now `string | null`.** The pipelex runtime sets exactly one of `image_stuff_name` / `document_stuff_name` (an image-based extract serializes `document_stuff_name: null`), so the previous non-null `string` type misdescribed real registry payloads. Breaking for consumers reading the field without a null check.

## [v0.12.0] - 2026-07-06

### Added

- **`StuffViewer` renders native `Html` concepts in a real sandboxed iframe.** When a stuff is (or wraps) an MTHDS `Html` concept, the HTML tab now renders its `inner_html` inside a fully sandboxed `<iframe>` (`sandbox=""`, `srcDoc`) instead of flattening it with inline sanitization. A full `<!doctype html>` document with its own `<style>` — an invoice, quote or report — now renders faithfully and stays isolated from the host page (no style leakage, doctype/`<head>`/`<style>` preserved). The markup still passes through a whole-document DOMPurify sweep as defense in depth. A new `extractInnerHtml` helper (`stuffViewerUtils.ts`) finds `inner_html` either directly (`{ inner_html, css_class }`) or one level deep in a structured concept that holds an `Html` field (e.g. `{ title, date, html_repr: { inner_html, css_class } }`); whitespace-only values are treated as absent so the viewer falls through to the existing `data_html`/JSON paths. Copy and Download on the HTML tab prefer this `inner_html`. New stories `Graph/StuffViewer` → `NativeHtmlConcept` and `WrappedHtmlConcept`; see `docs/stuff-viewer.md`.

## [v0.11.0] - 2026-06-30

### Fixed

- **Render `PipeStructure` operator nodes in the method graph.** A node with `pipe_type: "PipeStructure"` — emitted by pipelex for a real LLM-backed operator that turns Text into a structured concept (via `structuring_method = preliminary_text` or explicit authoring) — now validates and renders as an ordinary operator card (badge `Structure`) instead of throwing `GraphSpecValidationError` and blanking the entire viewer (the standalone adapter's "Failed to render method graph" screen). `PipeStructure` joins `PipeOperatorType`, gains a `PipeStructureBlueprint` in the registry union, and the detail panel shows its structuring config (model, text variable, output multiplicity, rendered prompt).
- **`PipeStructure` detail panel: surface an inline `llm_choice` model, drop the constant structuring row.** When `llm_choice` is an inline LLM setting object (a serialized `LLMSetting`) rather than a string handle, the Model row now derives its label from the object's `model` field instead of disappearing; the runtime-resolved model still wins when present. The always-constant "Structuring" row is gone — pipelex hardcodes `structuring_path`, so it never carried information.
- **Don't drop runtime execution data when a blueprint can't be resolved.** For any recognized operator or controller node whose blueprint isn't in the registry (partial/streaming graph, missing entry), the detail panel now falls back to the generic execution-data dump instead of rendering nothing — matching how unrecognized pipe types already behave. Previously such a node showed only "Blueprint not available" and silently hid its resolved model, rendered prompt, and other runtime values.

## [v0.10.0] - 2026-06-29

### Added

- **Configurable toolbar position:** The built-in floating toolbar is now positionable via a new `toolbarPosition` prop on `GraphViewer` (and `config.toolbarPosition`). It accepts any of the `TOOLBAR_POSITION` anchors — `top-left`, `top-center`, `top-right`, `bottom-left`, `bottom-center`, `bottom-right`, `center-left`, `center-right` — exposed as the `TOOLBAR_POSITION` constant / `ToolbarPosition` type. The bar's orientation is derived from the anchor (`toolbarOrientation` helper, also exported): the two edge-center anchors render a vertical column, every other position a horizontal row. The bar's side (left / center / right) is likewise derived via the exported `toolbarSide` helper. The prop is controlled and reactive (precedence: prop → `config.toolbarPosition` → `top-right`); persistence is the host's responsibility. The toolbar now renders inside a ReactFlow `<Panel>`, which owns all base positioning (anchor + margin), so the center anchors are truly centered. The default stays `top-right`, so existing consumers are unaffected. Right-anchored positions still dodge the open `DetailPanel`. The standalone config validates `toolbarPosition` and rejects unrecognized values. See `docs/toolbar-position.md`.

## [v0.9.0] - 2026-06-21

### Added

- **`system` theme mode:** The graph supports a tri-state theme mode (`system` → `light` → `dark`). In `system` mode it live-syncs with the host's `prefers-color-scheme` without a reload. New `GraphThemeMode` (`dark | light | system`) type and `GRAPH_THEME_MODE` constant; `GraphTheme` stays the resolved binary (`dark | light`) the palette consumes. The `system` value matches what pipelex emits (`ReactFlowTheme.SYSTEM`) and the React ecosystem convention (`next-themes` / shadcn).
- **`systemTheme` prop:** A new `GraphViewer` prop lets non-browser hosts (e.g. VS Code webviews) inject and authoritatively drive `system` theme detection. Omit it and `system` follows the browser.
- **Theme detection helpers:** Exported `useSystemTheme` and `detectSystemTheme` for external React and non-React consumers to read the environment's color scheme.
- **Standalone error screen:** The standalone HTML wrapper now renders a visible error screen for malformed embedded configs or specs (e.g. invalid JSON, bad `theme`/`direction`/`foldMode` tokens, a failed GraphSpec check) instead of failing silently to a blank page.
- **Documentation:** Added a `docs/theming.md` guide covering mode vs. resolved themes, SSR handling, and migration steps, plus design docs in `wip/` for theme auto-mode and `PipeSignature` node rendering.

### Changed

- **BREAKING:** The default theme is now `system` (previously `dark`). Consumers that don't set a `theme` will follow the OS/browser color scheme; pass `theme: "dark"` or `theme: "light"` to lock the appearance.
- **BREAKING:** `GraphViewer`'s `theme` prop and `config.theme` now accept `GraphThemeMode` (`dark | light | system`) instead of just `dark | light`.
- **BREAKING:** The `onThemeChange` callback signature changed from `(theme) => void` to `(mode, resolvedTheme) => void`. It now fires on toggle clicks, external prop updates, and live system changes, reporting both the selected `mode` (for persistence) and the `resolvedTheme` (for chrome sync). Handlers wired to the old single `theme` arg must handle the new `"system"` value (see `docs/theming.md` → "Migrating from the old `onThemeChange`").
- **Centralized theme management:** The library-owned in-graph toolbar is now the single source of truth for theme state. The standalone wrapper no longer manages page-level theme or its own toggle; page chrome stays in sync via `onThemeChange`.
- **Strict theme parsing:** The standalone config parser now throws on present-but-unrecognized theme values instead of silently coercing them to `dark`.

### Fixed

- **Standalone FOUC:** Added a static CSS fallback for `<body data-theme="system">` so page chrome is themed correctly on first paint, even before JS loads or if JS is disabled.
- **Legacy environment support:** Avoided a crash where `window.matchMedia` lacks the modern `addEventListener` API (e.g. older WebKit, some Electron/VS Code webviews) by falling back to the legacy `addListener`.
- **SSR hydration:** `useSystemTheme` now safely defaults to `dark` on the server to prevent crashes when `window` is undefined.

## [v0.8.0] - 2026-06-20

### Added

- **Render `PipeSignature` stub nodes in the method graph.** A node with `pipe_type: "PipeSignature"` — emitted by pipelex under `--allow-signatures` for a contract-only pipe that is declared but not yet implemented — now validates and renders as a distinct dashed, muted "stub" card (badge `Signature`) instead of throwing `GraphSpecValidationError` and blanking the entire viewer. `PipeSignature` joins `PipeOperatorType`, and the detail panel shows a "declared but not yet implemented" note for it.
- **`validateGraphSpec` — structural validation for GraphSpec JSON.** New exported function (`src/graph/validateGraphSpec.ts`) that enforces the GraphSpec contract before anything renders it: `meta.format` must be `"mthds"`, the spec must have nodes, every node needs a `description` and `domain_code`, and controller/operator nodes need a `pipe_code`. `GraphViewer` runs it at its input boundary, so a malformed or incomplete spec now fails fast with a descriptive error naming the offending node instead of silently rendering a broken or empty graph downstream.
- **`pipe_code` on graph nodes.** Controller and operator nodes now carry a `pipe_code` — the code of the pipe definition the node instantiates, distinct from the per-node `id`. It is used for node identification and to group cousin controllers (multiple instances of the same pipe). `validateGraphSpec` requires it on every controller and operator node.
- **`canceled` pipe status.** `PipeStatus` gains a `canceled` value, rendered across pipe cards, the pipe detail panel, and status badges alongside the existing `succeeded` / `failed` / `running` / `scheduled` / `skipped` states.

### Changed

- **GraphSpec JSON must now include `pipe_code` on controller and operator nodes, and a `status` on every node.** Breaking change for consumers feeding hand-built or pre-existing GraphSpecs: `validateGraphSpec` (invoked by `GraphViewer`) throws on a node missing `pipe_code`, and the node `status` field is no longer optional. GraphSpecs emitted by current pipelex already satisfy both. `buildPipeCardPayload` was refactored to consume the now-guaranteed `PipeCallNode` shape directly.
- **`StuffViewer` surfaces content serialization failures** instead of rendering empty on error, and ships its own `StuffViewer.css`.

### Internal

- **Pipeline fixtures are now generated from `.mthds` bundles instead of hand-maintained.** Removed the checked-in per-pipeline GraphSpec `.ts` files (`cvScreening.ts`, `rfpQualifier.ts`, …) and replaced them with `scripts/generate-fixtures.mjs`, which runs each bundle under `data/pipelines/` through the pipelex CLI and emits typed `_generated.dry.ts` (mock inputs, no inference) and `_generated.live.ts` (real inference) consumed by the Storybook stories. New Makefile targets: `make fixtures` / `make fixtures-live`, plus `ONLY=pipeline_NN` to regenerate specific pipelines and `make fixtures-live-missing` to fill only the gaps — partial runs merge into the complete fixture file rather than overwriting it.

## [v0.7.0] - 2026-06-11

### Changed

- **Detail panel close button scrolls with the content.** The "x" was an absolutely-positioned overlay pinned to the panel, floating over whatever scrolled beneath it; it now lives in a flow row at the top of the scrollable content, so it scrolls out of view with the content (close = scroll back up). It passes under the sticky pipe header on scroll.
- **Concept detail panel: structure behind a tab.** When a stuff node has instance data, the panel shows "Data" / "Structure" tabs with Data selected by default — the schema table no longer pushes the data viewer below the fold. Without data (dry run / unexecuted), the structure renders directly as before. Tab state resets when selecting a different node.

### Added

- **`pipelex-light` shiki theme.** Light counterpart of `pipelex-dark` — same scopes one-for-one, VS Code Light+ values for generic tokens, darkened brand accents (coral/teal/green/magenta/orange) for contrast on white. New exports: `pipelexLightTheme`, `getMthdsThemes()` (both themes, for editors like Monaco that register every theme up front); `getMthdsTheme(name?)` now takes an optional theme name (defaults to `pipelex-dark`).
- **Storybook stories for the shiki module** (`Shiki/Themes`): pipelex-dark, pipelex-light, and a side-by-side comparison.

### Removed

- **BREAKING: stock shiki themes dropped.** `dark-plus`, `monokai`, `dracula`, and `one-dark-pro` are no longer bundled or accepted by `highlightMthds` — `MthdsThemeName` is now `"pipelex-dark" | "pipelex-light"`. Consumers passing a removed theme name must switch to a pipelex theme (the playroom highlight API was updated in the same change).

## [v0.6.5] - 2026-05-15

### Added

- **Light theme.** `GraphViewer` now supports a `"light"` theme alongside the existing `"dark"` default (still dark unless `theme="light"` is passed). New props: `theme` (`"dark" | "light"`), `showThemeToggle` (defaults to `true` — renders a sun/moon button in the floating toolbar; set to `false` to hide it), and `onThemeChange` (fired on every theme change).

### Fixed

- **Standalone adapter silently swallowed malformed embedded JSON.** `readJsonScript()` in `src/standalone/adapter.ts` parses the `pipelex-graphspec` and `pipelex-config` `<script type="application/json">` tags that pipelex emits into the standalone HTML viewer. Its `catch` block returned `null` on any `JSON.parse` failure, making a malformed tag indistinguishable from a legitimately absent one — so if the upstream HTML generator ever emitted broken JSON, the viewer rendered an empty graph with no error reported anywhere. The catch now re-throws an `Error` naming the offending `<script>` tag and the underlying parse message; the throw lands in the post-mount data-load tick, so it surfaces in DevTools / `window.onerror` without white-screening the already-mounted viewer. The legitimate "tag absent or empty → `null`" path is unchanged.

## [v0.6.4] - 2026-05-13

### Fixed

- **Folded fold mode now forces `showControllers` on at initialization.** When `initialFoldMode` (or `config.foldMode`) was `"folded"` but the host left `showControllers` off, the GraphViewer rendered folded controllers as pipe cards but hid the toolbar's expand-all button — the user had no global path to unfold the graph and had to click each folded card individually. `GraphViewer` now overrides `initialShowControllers` to `true` whenever the effective fold mode is `"folded"`, so the toolbar always exposes the expand-all action on a folded-on-startup graph. Hosts can still toggle `showControllers` off interactively after the initial render.

## [v0.6.3] - 2026-05-13

### Fixed

- **Standalone bundle was missing from the published npm tarball.** Releases v0.4.0–v0.6.2 ran only `npm run build` (tsup) before `npm publish`, which produces `dist/index.js`, `dist/graph/`, and `dist/shiki/` but not the standalone IIFE bundle (`scripts/build-standalone.mjs` writes to `dist/standalone/`). Downstream consumers that load the bundle from a CDN (jsDelivr / unpkg) hit a 404 — the bundle existed only in maintainers' local checkouts. Coupling `build:standalone` to `build` via a `postbuild` hook (plus pointing `prepare` at `npm run build` so the `npm publish` lifecycle doesn't run a bare `tsup` and clobber `dist/standalone/`) fixes this, and a new release-workflow guard fails CI if the standalone files are missing before publish.

### Changed

- **LR pipe-card header now puts `pipe_code` on its own line below `pipe_type`.** In horizontal (LR) layout the narrow pipe cards previously crammed badge + code + status onto one row; long codes were cut off by ellipsis. The header now wraps onto two rows for LR (badge/status on top, code below) and stays single-row for TB. Card height estimation in `elkGraphBuilder` was split into per-direction constants (`PIPE_CARD_HEADER_HEIGHT_LR` / `_TB`) so the layout reserves the right vertical space.

## [v0.6.2] - 2026-05-12

### Fixed

- **Standalone bundle: `foldMode` was not forwarded to `GraphViewer`.** The `foldMode` field on `GraphConfig` and the `initialFoldMode` prop on `GraphViewer` shipped in v0.6.0, but `src/standalone/adapter.ts` picked config keys out of the embedded `pipelex-config` JSON explicitly and silently dropped `foldMode`. Hosts of the IIFE bundle (`graph-viewer.{js,css}`, including pipelex's reactflow HTML output) couldn't seed the initial fold state — controllers always started fully expanded regardless of what the embedded config said. The adapter now validates `foldMode` against the `FOLD_MODE` constants (`"folded"` / `"expanded"` / `"auto"`), falls back to `"expanded"` on missing or invalid values, and forwards it to `GraphViewer` as both `initialFoldMode` and inside `config`. Config parsing was extracted into a new pure module `src/standalone/viewerProps.ts` (with `buildViewerProps()`) so the wire-through is now unit-tested. Third standalone-bundle wire-through gap in the v0.4–v0.6 window after the v0.4.1 / v0.6.1 missing-CSS fixes — consumers of the npm package were unaffected because they pass `foldMode` to `GraphViewer` directly.

### Internal

- **Automated regression guards against standalone-bundle drift.** Two CI-enforced parity tests close the gap that produced the v0.4.1 / v0.6.1 / v0.6.2 fixes. First: `buildViewerProps` was refactored to spread the embedded config blob (`...cfg`) and then override only validated fields (`foldMode`, `direction`, `showControllers`) — any future `GraphConfig` key now flows through automatically, eliminating the v0.6.2-shape bug class. A new `viewerProps.test.ts` parity test asserts every key in `DEFAULT_GRAPH_CONFIG` reaches the output, catching the case where someone reverts to cherry-picking. Second: the hand-maintained `cssFiles` allow-list in `scripts/build-standalone.mjs` was extracted into `scripts/standaloneCssFiles.mjs` (shared by the build and the test), and a new `cssManifest.test.ts` walks `src/**/*.{ts,tsx}` for relative `.css` imports and asserts every resolved path is present in the manifest. Together these prevent the next "wire-through silently dropped" regression from reaching a release.

## [v0.6.1] - 2026-05-12

### Fixed

- **Standalone bundle: `GraphToolbar.css` was missing.** `scripts/build-standalone.mjs` concatenates CSS files into the standalone bundle via an explicit allow-list (the JS build uses `loader: { ".css": "empty" }`, so side-effect CSS imports from React components are stripped on purpose). The toolbar stylesheet `src/graph/react/viewer/GraphToolbar.css` — introduced in v0.4.0 alongside the floating `GraphToolbar` component — was never added to that list, so every consumer of the standalone IIFE bundle (`graph-viewer.{js,css}`, including mthds-ui's own `graph-standalone.html` demo) rendered the toolbar in the DOM but with no styling (no `position: absolute`, no backdrop, no button visuals) — effectively invisible. Consumers of the npm package were unaffected because their bundler (e.g. Next.js, esbuild with proper CSS loader) picks up the side-effect import from `GraphToolbar.tsx` directly. The CSS file is now in the allow-list and ships in `graph-viewer.css`.

## [v0.6.0] - 2026-05-12

### Added

- **Foldable pipe controllers.** Each `PipeSequence` / `PipeParallel` / `PipeCondition` / `PipeBatch` controller group now has a fold toggle (`⤡`) in its header bar. Folded → the group collapses to a single pipe card with the controller's badge, IO, and status; expanded (default) → renders as today. Edges into/out of the controller are reattached to the folded card; internal-only edges are dropped; batch labels collapse to `[N]`. A new pure transform `applyFolds()` (`src/graph/graphFolds.ts`) drives the rewrite; `PipeCardBase` renders an `⤢` expand button on folded cards. Per-instance state — fold/unfold independently across nodes.
- **Cousin folding.** A normal click on a controller's fold/expand button mirrors the action to every other controller that shares the same `pipe_code` (its "cousins" — e.g. three `route_by_match` controllers in a batched pipeline fold together). Hold `alt`/`option` to fold or expand only the clicked controller. Exposed as `FoldToggleOptions { soloMode?: boolean }` and `findCousinControllers()` for downstream consumers.
- **"Fold all" / "Expand all" toolbar buttons.** Built-in toolbar gains two buttons that fold or expand every controller in the current graph. Hidden when `showControllers` is off or no controllers exist; each button disables itself when its action would be a no-op (with a `(nothing to fold)` / `(nothing to expand)` tooltip suffix). Wired through new optional `GraphToolbar` props (`onFoldAll`, `onExpandAll`, `foldAllDisabled`, `expandAllDisabled`).
- **`initialFoldMode` prop on `GraphViewer` + `foldMode` field on `GraphConfig`.** Hosts can now seed the controller fold state when a graph first opens, instead of always starting fully expanded. Three values are accepted via the new `FOLD_MODE` constant: `"folded"` collapses every controller into a single pipe card on the first layout pass, `"expanded"` leaves them as group wrappers (previous behavior), and `"auto"` is a pass-through reserved for renderer-defined heuristics — it currently behaves the same as `"expanded"`. The seed is applied once per graphspec; users can still fold/unfold individually via the toolbar afterwards. `DEFAULT_GRAPH_CONFIG.foldMode` defaults to `"expanded"` so existing consumers see no change.
- **`buildPipeCardPayload()` exported helper** (`src/graph/pipeCardPayload.ts`) for building a `PipeCardPayload` from a `GraphSpecNode` + `GraphSpec` + `DataflowAnalysis`. Used internally by `buildDataflowGraph` and `applyFolds`; available for consumers that want to render pipe cards outside the standard pipeline.

### Changed

- **BREAKING: `GraphSpecNode.pipe_type` is now required (was optional).** The runtime always needs a pipe type to pick the right card layout, badge, and operator/controller classification; allowing it to be missing forced a silent `"PipeFunc"` fallback in `buildDataflowGraph` that masked malformed inputs. Consumers building `GraphSpec` values by hand must set `pipe_type` on every node — pipelex CLI output already does so. The operator/controller distinction inside `buildPipeCardPayload` now reads `analysis.controllerNodeIds` rather than string-matching against `pipe_type`.
- **Keyboard focus rings on graph control buttons** (`.controller-group-fold`, `.controller-group-collapse`, `.pipe-card-expand`, `.pipe-card-io-more`). The previous `all: unset` reset removed the native `:focus-visible` outline; an explicit ring is now drawn so keyboard users can see what's focused.

### Fixed

- **Folded controller hiding its declared output stuff node.** When the outermost folded controller declared a stuff as one of its outputs (e.g. `match_analyses` on the `batch_analyze_cvs_for_job_offer` PipeSequence in `cv_batch_screening`), the stuff lived inside the controller via `buildChildToControllerMap`'s "stuff produced by controllers themselves → assign to parent controller" step. Folding the controller hid the stuff with the rest of the internals and collapsed its incoming `batch_aggregate` edges into self-loops, so the final output disappeared from the graph. `applyFolds` now promotes such stuff nodes out of their outermost folded declarer to that declarer's parent context, so the folded pipe-card stays connected to its external output (the surviving batch edge keeps its dashed style and is relabeled `[N]`).

## [v0.5.2] - 2026-05-12

### Fixed

- **Spacebar input swallowed in editors mounted next to `GraphViewer`.** ReactFlow's default `panActivationKeyCode='Space'` attaches a `window`-level keydown listener that can call `preventDefault()` on the spacebar, blocking text input in adjacent editors (e.g. Monaco). `GraphViewer` now sets `panActivationKeyCode={null}` on its `<ReactFlow>` so the space key is never intercepted at the window level.

## [v0.5.1] - 2026-05-05

### Added

- **New exported type `FieldResolution`** (`{ method: "from_var" | "fixed" | "template" | "nested"; rendered?: string }`).
- **`canEmbedPdf` and `onOpenExternally` props on `StuffViewer`, `ConceptDetailPanel`, and `GraphViewer`.** Hosts that can't render `<embed type="application/pdf">` (e.g. VS Code webviews, which run inside Electron without the Chromium PDFium plugin) can now set `canEmbedPdf={false}` to fall back to a clickable tile that triggers `onOpenExternally` (or `window.open` if not provided). `onOpenExternally` also overrides the default `window.open` behavior of the StuffViewer toolbar's "open externally" button — wire it to the host's external-open mechanism (e.g. `vscode.env.openExternal` via postMessage). Both props are forwarded through `GraphViewer` → `ConceptDetailPanel` → `StuffViewer` so consumers only have to pass them once at the top level.
- **`PDFContentEmbedDisabled` Storybook story** demonstrating the embed-disabled fallback tile.

### Changed

- **PipeCompose `execution_data.resolved_fields` → `execution_data.fields`.** Per-field resolution record `{ method, rendered? }` keyed by field name; `rendered` is set only for `template` fields. The detail panel reads `rendered` for templates and ignores other methods (their contract lives in the blueprint).

### Internal

- Prettier reformat across detail panel files, `GraphToolbar`, `GraphViewer`, and `StuffViewer`.

## [v0.5.0] - 2026-05-04

### Added

- **First publish to the npm registry as `@pipelex/mthds-ui`.** Adds `publishConfig` (`access: public`, `provenance: true`) so the scoped package publishes as public with npm provenance attestations. The `release.yml` workflow now builds, runs tests, and publishes to npm on every push to `main` when the `package.json` version isn't already on the registry, then tags the commit and creates a GitHub release with notes pulled from this changelog.
- **`./graph/react/viewer/GraphToolbar.css` subpath export.** The toolbar stylesheet was already copied to `dist/` by `tsup` but wasn't reachable through the package's `exports` map, forcing consumers to import it via deep paths. It's now a first-class export alongside the other component stylesheets.

## [v0.4.1] - 2026-04-16

### Fixed

- **`GraphToolbar` rendered without styles in the published package.** The v0.4.0 toolbar shipped as invisible/unstyled for every consumer because `tsup.config.ts` didn't register `GraphToolbar.css` — tsup silently dropped the `import "./GraphToolbar.css"` from the built JS and never copied the file to `dist/`. The CSS file is now externalized and copied to `dist/graph/react/viewer/GraphToolbar.css` alongside the other component stylesheets. Added a `CSS Packaging` section to `CLAUDE.md` documenting the two-step registration required whenever a new `.css` file is added.

## [v0.4.0] - 2026-04-16

### Added

- **Built-in floating toolbar on `GraphViewer`** with five controls, grouped left-to-right: toggle layout direction (LR ↔ TB), toggle pipe-controller grouping, then a separator followed by `−` zoom out, `+` zoom in, and fit-view. Zoom/fit buttons delegate to xyflow's own `zoomIn()` / `zoomOut()` / `fitView()` on the ReactFlow instance — no custom zoom math — but share the dark translucent chrome of the direction/controllers buttons so the whole cluster reads as one toolbar. The toolbar now lives inside mthds-ui so every consumer gets the same UI — no need to re-implement it per app. Positioned absolutely at the top-right of the graph background; when the detail panel is open, the toolbar shifts left by the panel's width so it stays on the graph background (never over the panel) and remains visible at any panel size. New `hideToolbar` prop disables it for consumers that want to provide their own controls. (`<Controls />` from `@xyflow/react` was considered but rejected: its light-theme chrome clashed with the dark toolbar and its built-in positioning can't shift with the detail panel.)
- **`pipelex-storage://` URI resolution in `StuffViewer`** via a new `resolveStorageUrl?: ResolveStorageUrl` prop. Internal pipelex-storage URIs aren't browser-fetchable; the viewer now calls the consumer-supplied resolver to exchange them for short-lived, browser-fetchable URLs (e.g. presigned S3) before rendering images/PDFs inline. If the stuff data already has an `http(s)://` URL, that's preferred and the resolver is skipped. Resolution is async, cancellation-safe on unmount/stuff-change, and falls back to the "no preview" placeholder if the resolver returns `null`. The resolver is threaded through `ConceptDetailPanel` and `GraphViewer`'s built-in stuff detail panel so consumers only have to pass it once at the top level.
- **Smarter MIME detection via `resolveMimeType`** (new utility in `stuffViewerUtils`). Previously, PDF/image preview decisions were made from `stuff.contentType` — but `contentType` is often the concept tag (e.g. `"document"`), not a MIME type. The resolver now checks in order: (1) `contentType` when it already looks like a MIME, (2) `data.mime_type` (Document content carries this), (3) the file extension in `filename` or in the URL/URI. Supports `pdf`, `png`, `jpg`/`jpeg`, `gif`, `webp`, `svg`, `bmp`. This makes storage-resolved PDFs and images actually render as previews instead of falling back to raw JSON.
- **New public exports** from `@pipelex/mthds-ui/graph/react`: `ResolveStorageUrl` type, `extractStorageUri(data)`, and `resolveMimeType(data, contentType, url)` — consumers can reuse them when building custom viewers or precomputing preview state.
- **`GRAPH_DIRECTION` constant** exported from `@graph/types` (mirrors the existing `EDGE_TYPE` pattern). `GraphDirection` type is now derived from it. Use `GRAPH_DIRECTION.TB` / `LR` / `RL` / `BT` instead of string literals so the compiler enforces exhaustiveness.

### Changed

- **BREAKING: `GraphViewer` props `direction` and `showControllers` renamed to `initialDirection` and `initialShowControllers`.** They are now initial values for internal state (the built-in toolbar drives user-facing toggling). Consumers that previously passed these as controlled values should either rely on the new toolbar or set `hideToolbar` and manage state externally via their own UI.
- **`getHtmlTabLabel` now accepts `string | null | undefined`** (was `string | undefined`) to match the new `effectiveMime` nullability inside `StuffViewer`.
- **Standalone HTML shell: removed the redundant external toolbar** (direction toggle, controllers toggle, zoom in/out/fit). Those now live inside `GraphViewer` itself, and the external buttons stopped driving viewer state once `direction`/`showControllers` became mount-only initial props. Title/logo and theme toggle remain. DOM ids `direction-toggle`, `controllers-toggle`, `zoom-in`, `zoom-out`, `zoom-fit` no longer exist.
- **Direction toggle now handles all four axes.** Previously, clicking the toggle while `direction` was `RL` or `BT` collapsed the graph to `TB`. The toggle now treats `TB`/`BT` as vertical and `LR`/`RL` as horizontal, flipping between the two canonical forms so label, icon, and click behavior stay consistent. (Flagged in PR review: cubic-dev-ai.)

### Fixed

- **Storage URL resolver output is now scheme-validated** through the same `isInlineRenderableUrl` guard used by every other URL path in `StuffViewer` — a faulty or compromised resolver can't slip `javascript:` / `data:` / `vbscript:` URLs into `<img>` / `<iframe>`. (Flagged in PR review: cubic-dev-ai.)
- **Stale resolved storage URL** when switching between two `pipelex-storage://` stuff items: the viewer now clears the previously resolved URL synchronously before kicking off the new async resolution, so the new item never briefly renders the old one's image/PDF during the in-flight window. (Flagged in PR review: cubic-dev-ai, greptile-apps.)
- **`ResolveStorageUrl` JSDoc** now documents the stable-reference requirement (wrap in `useCallback` or define outside the component), since the resolver is in `StuffViewer`'s `useEffect` deps and a fresh arrow on every parent render re-triggers the presigned-URL fetch. (Flagged in PR review: greptile-apps.)

## [v0.3.4] - 2026-04-10

### Fixed

- **PipeCompose detail panel was surfacing input data as if the pipe had produced it**. The panel was reading `execution_data.resolved_fields` for every construct field method, which made `from_var` fields display the actual value pulled from working memory (e.g. `score = 2`, `candidate_name = "John Doe"`). That value isn't authored by the pipe — it lives in the input stuff node — so showing it on the pipe was misleading. The panel now follows a strict design rule: it shows the **field contract**, not runtime data. `from_var` displays as `← match_assessment.score` (the path), `fixed` as `= "no_match"` (the literal), `nested` recurses, and `template` is the only method that still shows the rendered output (since template is the only construct method where the pipe actually computes something new).
- **PipeCompose detail panel: long resolved field values broke the KV row layout**: when `execution_data.resolved_fields` contained a long value (e.g. an LLM-generated `rationale` of 800+ chars), the value wrapped across many lines inside a flex row designed for one-line content. The label drifted to the vertical center of the wrapped block. Long values (>60 chars or containing newlines) now render as a labeled `FieldBlock` (bordered scrollable text box, max-height 240px) instead of a KV row. The KV row CSS was also hardened (`align-items: flex-start`, `flex: 1 1 0`, `word-break`, `overflow-wrap`) as defense-in-depth.

### Added

- **Recursive nested construct rendering in the PipeCompose detail panel**. Previously, `nested` fields rendered as a flat `(nested construct)` placeholder, hiding everything inside. The panel now walks the construct tree recursively: each nested sub-construct renders its own header (`name · nested · N fields`) followed by its sub-fields, indented 12px per depth level, with a green left border connecting the sub-section to its parent. Deep structures (4+ levels) are fully visible by default — no clicking, no tooltips, just scroll. Implementation lives in a new `ConstructFieldsBlock` component in `PipeComposeDetail.tsx`.
- **Reorganized detail panel storybook layout** under `src/graph/react/detail/__stories__/`:
  - `Stuff/` for stuff/concept stories (`ConceptDetail.stories.tsx`)
  - `Resizable/` for the resizable panel stories
  - `Pipes/` with one subfolder per pipe type (`PipeLLM/`, `PipeExtract/`, `PipeImgGen/`, `PipeSearch/`, `PipeSequence/`, `PipeParallel/`, `PipeCompose/`)
  - Inside `Pipes/PipeCompose/`, dedicated edge-case files: `TemplateMode`, `ConstructFixed`, `ConstructFromVar`, `ConstructTemplate`, `ConstructNested`, `ConstructMixed`, `ConstructRenderedTemplates`, `EmptyTemplateField`
  - Shared helpers (`detailPanelDecorator`, `PipeStory` wrapper, `makeComposeBlueprint`, sample text fixtures) extracted into `_shared.tsx`
- **HUGE-content stress-test variants for every PipeCompose construct story**. Each construct edge-case file now has a `Huge*` story exercising the renderer at scale: ~3000-char rationale paragraph, ~4000-char multi-paragraph email template, 25-question interview bank, deeply-structured pipeline config object, 14-field deeply-nested `from_var` paths, 4-level deeply-nested sub-constructs. Stress-tests `FieldBlock` rendering, panel scroll behavior, and the recursive nested renderer.

### Changed

- **`PipeComposeConstructField.method` is a closed union** (`"from_var" | "fixed" | "template" | "nested"`). Previously included a trailing `| string` escape hatch that absorbed the literal cases and killed exhaustiveness checking on switches. The construct field formatter is now exhaustive — any new method added to the union will fail to compile until it's handled. (carried forward from v0.3.3 work, finalized here)
- **`PipeComposeConstructField.nested`** now typed as recursive `PipeComposeConstructBlueprint | null` instead of `Record<string, unknown> | null`. Enables the recursive renderer to drill into sub-constructs with full type safety.

## [v0.3.3] - 2026-04-10

### Fixed

- **PipeCompose detail panel empty for field-level construct form**: `PipeComposeDetail.tsx` only read the legacy monolithic `blueprint.template` field, which is `null` when a pipe uses `[pipe.X.construct]` (the field-level form where each output field has its own method — `from_var`, `fixed`, `template`, `nested`). The panel now renders the `construct_blueprint.fields` map: non-template fields appear as a FIELDS section with KV rows, and each template field gets its own `PromptToggle` labeled `Template — <field_name>`.
- **Runtime-resolved construct values now rendered**: when the graph tracer emits `execution_data.resolved_fields` (new in pipelex worker), the panel shows the runtime value instead of the static blueprint summary. Template fields display the Jinja-rendered text (with `$var` substitutions applied), and `from_var`/`fixed` fields show the concrete value pulled from working memory. **(Note: this behavior was reversed in v0.3.4 — see the v0.3.4 entry for the rationale.)**
- **PipeCompose template-field routing bug**: fields with `method === "template"` but an empty/null `template` string were misrouted to the non-template KV section and rendered as `(template)`. Routing now depends on `method` alone — `PromptToggle` already returns null when both `templateText` and `renderedText` are falsy, so empty templates are handled gracefully. (PR #23 review)
- **Pipe card description clipping in LR and TB**: description was hardcoded to `-webkit-line-clamp: 2` for both directions, which didn't match the card shapes. LR cards (narrow/tall) are now 3-line clamped vertically; TB cards (wide/short) are 1-line with horizontal ellipsis. Both truncate cleanly with `...`.
- **Pipe card height undercounted for wrapping pills in TB**: the height estimator assumed 3 pills per row regardless of pill width, so long input names caused outputs to overflow the card and get clipped. The estimator now bin-packs pills against the available area width (accounting for label column + padding) and reserves accurate height per wrapping row. The description height also now scales with actual line count instead of a fixed 24px reserve.
- **Stuff nodes wider than pipe cards in LR**: stuff nodes were capped at 400px regardless of direction, while LR pipe cards max out at 240px — producing visually lopsided graphs. Stuff node width now tracks the pipe card max for the current direction (240 in LR, 400 in TB).
- **Stuff/pipe node labels overflowed their container**: `renderLabel.tsx` set no max-width or truncation on label/concept spans, so long identifiers bled past the node edges. Both spans now truncate with `text-overflow: ellipsis` + `white-space: nowrap` and surface the full text via a native `title` tooltip on hover.

### Changed

- **`PipeComposeBlueprint.template` is now `string | null`** (was `string`). Reflects reality: the field is null when `construct_blueprint` is used instead.
- **New types: `PipeComposeConstructField`, `PipeComposeConstructBlueprint`**. Strongly typed replacement for the previous `construct_blueprint: Record<string, unknown> | null`. Consumers can now introspect field methods, from paths, templates, and fixed values with full type safety.
- **`PipeComposeConstructField.method` is a closed union** (`"from_var" | "fixed" | "template" | "nested"`). Previously included a trailing `| string` escape hatch that absorbed the literal cases and killed exhaustiveness checking on switches. `formatConstructField`'s switch is now exhaustive — any new method added to the union will fail to compile until it's handled. (PR #23 review)
- **Pipe card layout constants extracted** in `elkGraphBuilder.ts`. The height estimator was a pile of magic numbers; it's now a set of named `PIPE_CARD_*` constants with comments pointing at the matching CSS rules, plus two pure helpers (`estimateDescriptionLines`, `countTbPillRows`) that are individually reviewable. The `320px` height cap is preserved.

## [v0.3.2] - 2026-04-10

### Fixed

- **Detail panel CSS not loading in consumers**: `DetailPanel.css` and `StuffViewer.css` were extracted into `index.css` by tsup but never imported by the built JS. Externalized both CSS files in `tsup.config.ts` so their imports are preserved in the output, matching the existing `graph-core.css` pattern.
- **PromptToggle showing empty when only template available**: When `renderedText` (from execution_data) was undefined, the component showed blank instead of falling back to `templateText`. Now shows whichever text is available, defaulting to rendered when both exist.

### Added

- `renderDetailExtra` prop on `GraphViewer`: render function that injects custom content below the built-in detail panel for the selected node. Enables consumers to add app-specific UI (e.g., input forms) without reimplementing the panel.
- `DetailPanel.css` export in `package.json` (`./graph/react/detail/DetailPanel.css`)

## [v0.3.1] - 2026-04-09

### Fixed

- Edge type `"bezier"` renamed to `"default"` to match ReactFlow v12 (fixes console spam)
- `useState` hooks moved before early return in `PromptToggle` (React rules of hooks violation)
- Guard `navigator.clipboard` before `writeText` call (prevents error when Clipboard API unavailable)

### Changed

- `EDGE_TYPE` constant object for ReactFlow edge types (replaces string literals)

## [v0.3.0] - 2026-04-09

### Fixed

- Close button z-index fixed to stay above sticky header

### Added

- Resizable detail panel: drag the left edge to resize between 280px and 800px, width persists during session
- Escape key closes the detail panel (controllable via `closeOnEscape` prop)
- Sticky header in pipe detail panel: pipe info, status, inputs, outputs stay pinned at top while scrolling
- Prompt expand/collapse toggle button: collapsed shows 300px with scroll, expanded shows full content
- Copy button on prompt blocks (system prompt, user prompt, template)
- PipeLLM and PipeCompose: prompts moved to bottom of the detail section
- `useResizable` hook for horizontal panel resize (pure React, no dependencies)
- Storybook stories: resizable panel (default/min/max width), local image/PDF fixtures
- Pipeline 30: CV Analyzer with concept refinement (`DetailedMatchResult` refines `MatchResult`), dry + live runs
- Pipeline 31: RFP Qualifier with structured concepts, dry + live runs
- Concept detail panel stories: parent concept (`Evaluation`) and refined concept (`TechnicalEvaluation`)
- `/add-pipeline-story` skill for adding new pipeline examples from `.mthds` bundles
- Storybook static file serving (`staticDirs`) for local fixture files
- `.npmignore` to exclude dev files from git installs
- CLA document

### Changed

- Detail panel resize handle hit area widened to 12px (visible bar stays 2px)

## [v0.2.6] - 2026-04-08

### Fixed

- StuffViewer now renders images and PDFs inline with both local URLs (`file://`) and remote URLs (`http://`, `https://`)
- `pipelex-storage://` URLs (internal, non-browser-renderable) show a clean fallback card with filename instead of a blank embed or generic placeholder
- PDF embed hides the browser sidebar by default (`#pagemode=none`)
- PDF Storybook story now uses a real, loadable PDF URL

### Added

- `isInlineRenderableUrl` and `extractInlineUrl` utilities for separating inline-renderable URLs from link-safe URLs
- `extractFilename` utility for extracting filename metadata from stuff data
- `InternalStorageImage` Storybook story demonstrating the fallback for non-renderable URLs
- GitHub Actions workflows: guard-branches, version-check, changelog-check, quality-checks, release (tag + GitHub Release), CLA
- README install instructions updated for git tag references (`github:Pipelex/mthds-ui#vX.Y.Z`)

## [v0.2.5] - 2026-04-07

### Changed

- elkjs loaded via CDN — use shim that reads `window.ELK` instead of bundling elkjs

## [v0.2.4] - 2026-04-07

### Added

- Standalone build: esbuild IIFE bundle (`dist/standalone/graph-standalone.html`) for embedding GraphViewer in single HTML files without a bundler
- Standalone adapter, CSS, and HTML template with sentinel-based data injection
- `build:standalone` npm script

## [v0.2.3] - 2026-04-06

### Added

- Built-in detail panel in GraphViewer: click any pipe or stuff node to inspect
- Per-pipe-type detail sections: PipeLLM, PipeImgGen, PipeExtract, PipeSearch, PipeCompose, PipeCondition, PipeSequence, PipeParallel, PipeBatch
- Prompt toggle: switch between template and rendered prompt (default: rendered)
- Concept detail panel: schema table, refinement chain, live data via StuffViewer
- Execution data display: resolved models, rendered prompts, structuring paths, expression results
- TypeScript types for GraphSpec enrichment: pipe_registry, concept_registry, execution_data, ConceptInfo, PipeBlueprintUnion with per-type interfaces
- Registry lookup helpers: getPipeBlueprint, getConceptInfo, resolveConceptRef

### Changed

- GraphViewer now manages its own detail panel state (no external wrapper needed)
- Reduced StuffViewer font sizes (JSON, Pretty, HTML tabs) to 11px

## [v0.2.2] - 2026-04-02

### Fixed

- Reset list styles (ul only) in StuffViewer HTML content to prevent browser defaults

### Added

- PageList Storybook story for StuffViewer with multi-page data

## [v0.2.1] - 2026-04-02

### Added

- StuffViewer component for stuff content inspection
