---
status: active
item: L-260925-7a8f98
---

# Plan: the React entries stop injecting the kernel's stylesheet

The design is [`design.md`](design.md) beside this file, ratified on 2026-09-25 as recommended: the React entries import no kernel stylesheet; a host with Tailwind 4 follows the kernel's documented Tailwind 4 setup with `@import "@pipelex/mthds-ui/tailwind.css"` in place of its `@source` line; a host without Tailwind imports `@pipelex/mthds-ui/form-kernel.css` once.

## Kickoff

A fresh session starts here.

- **Where.** The worktree is `/Users/lchoquel/repos/Pipelex/_mthds-ui--kernel-layer-beats-v4`, on `feature/Kernel-layer-beats-v4`. Start Claude Code inside it, or run `wt open --for L-260925-7a8f98` from the workspace root. Treat the worktree as the root.
- **First command.** `ledger claim L-260925-7a8f98 --renew`, from inside the worktree.
- **Read first.** `design.md` in full; this plan; the kernel's `docs/theming.md`, section "A host that runs Tailwind (the common case)", which is the Tailwind 4 host contract this change points hosts at (in the sibling checkout `../mthds-form/docs/theming.md`, and public at `https://github.com/Pipelex/mthds-form/blob/main/docs/theming.md`); and this repository's `CLAUDE.md` sections "CSS Packaging" and "The form kernel is a DEPENDENCY, re-exported".
- **Rules that bite here.** This repository is public, so nothing written in it, whether source, tests, docs or the changelog, names a closed-source repository; the two Tailwind 4 consumers are "a host application". Run `make check && make test` after every code change. A checkpoint ends with `/rev`. Visual checks in Storybook go through `/browse`.
- **Where to stop.** Phases 1 and 2 are one session's work and end at Checkpoint A. Phase 3 needs throwaway builds of two other repositories and is a natural second session.

A prompt that starts the work: "Implement `wip/kernel-layer-beats-v4/plan.md` from Phase 1 through Checkpoint A. Read the Kickoff section first."

## Phase 0: ratification — done

- [x] Decision 1 is B with C, Decision 2 names the two host stylesheets as the design gives them, and Decision 3 documents Tailwind 3 and prefixed Tailwind 4 hosts as unsupported. Ratified by the owner on 2026-09-25, after Codex's adversarial review, whose accepted objections are in the design's "Review" section and in the steps below.
- [x] `design.md` and this plan are `active`.
- [x] Consumer follow-ups filed, each blocked by L-260925-7a8f98: L-260925-226ec9 for the VS Code extension's webview to import `@pipelex/mthds-ui/form-kernel.css` when it bumps to the release; L-260925-235cfe and L-260925-43ced4 for the two Tailwind 4 host applications to replace their own `@source` path, direct kernel declaration and layer statement with the one import.

## Phase 1: the package — done in df85e4c

- [x] Remove `import "../../styles/form-kernel.css";` from `src/graph/react/index.ts` and `src/form/react/index.ts`. Rewrite both block comments to say that the entries import no kernel stylesheet on purpose and that the host loads what its kind of host needs, with a pointer to the README section. Keep the short history of why v0.20.0 made the import this package's job, because it is what a future reader will be tempted to restore, and say why it was undone.
- [x] Rewrite the header comment of `src/form/react/RunPanel.css`, which says both entries import the kernel's sheet and the host adds nothing.
- [x] Add `src/styles/tailwind.css`, holding `@source "../../../mthds-form/dist";` and `@source "../../node_modules/@pipelex/mthds-form/dist";`, both relative to where the file lands at `dist/styles/`. Its comment says which install layout each path serves (a pnpm virtual store or a hoisted npm tree for the first, npm nesting the kernel under this package for the second), that Tailwind resolves the file to its real path before resolving them, that a path that does not exist is skipped silently, which is why both are listed, and that this file replaces only the `@source` line of the kernel's documented setup.
- [x] Rewrite the comment in `src/styles/form-kernel.css`: it is the sheet for a host without Tailwind, imported once by that host; its preflight resets every browser default the host does not restate; the layer lets the host's own rules win ties against the kernel's utilities; a host with Tailwind 4 uses `tailwind.css` instead and must not import this one.
- [x] `tsup.config.ts`: drop `/styles\/form-kernel\.css$/` from `external`, since no JavaScript imports it any more, and copy `src/styles/tailwind.css` to `dist/styles/tailwind.css` in `onSuccess` beside the existing copy of `form-kernel.css`.
- [x] `package.json` `exports`: add `"./tailwind.css": "./dist/styles/tailwind.css"` and `"./form-kernel.css": "./dist/styles/form-kernel.css"`.
- [x] `scripts/standaloneCssFiles.mjs` and its `.d.mts`: remove the alias from `src/styles/form-kernel.css` to the kernel's sheet, which only existed because the graph entry imported the wrapper. If no alias remains, remove the aliasing mechanism from `src/standalone/__tests__/cssManifest.test.ts` too rather than leaving it unused. The manifest's own entry for `node_modules/@pipelex/mthds-form/dist/styles.css` stays, since the standalone bundle is a host without Tailwind.
- [x] `src/styles/__tests__/formKernelLayer.test.ts`: invert the entry assertion so that no React entry imports any kernel stylesheet, neither `@pipelex/mthds-form/styles.css` nor the wrapper. Keep the assertions that the wrapper is layered and does not import `theme.css`. Assert that `tailwind.css` carries both `@source` candidates, and that each one, resolved from `node_modules/@pipelex/mthds-ui/dist/styles/`, lands on the kernel's `dist` for the layout it serves. Rewrite the file's header, which restates the claim the design shows is false.
- [x] `scripts/smoke-pack.mjs`, the host-imported stylesheets: the check that every exported stylesheet is imported by the JavaScript that needs it learns that `tailwind.css` and `form-kernel.css` are imported by the host by design, and asserts instead that no JavaScript in the package imports either.
- [x] `scripts/smoke-pack.mjs`, the minimal Tailwind 4 host, as the design's "Guards" section specifies. Install the tarball into a bare consumer twice, once with npm and once with pnpm; both are required, and the script fails with a message naming `corepack enable` when `pnpm` is not on the path. In each, install `tailwindcss`, its PostCSS plugin and `tw-animate-css`, and compile a stylesheet that is the kernel's documented setup and nothing more: `@import "tailwindcss"`, `@import "tw-animate-css"`, `@import "@pipelex/mthds-ui/tailwind.css"`, and an `@theme inline` mapping whose keys are derived from the token names the kernel's shipped `theme.css` defines, plus the `--radius-lg`, `-md` and `-sm` keys, so that the check follows the kernel rather than a list in the script. The oracle is the kernel's shipped `styles.css`: every selector in its `utilities` layer must appear in the output. If the two sets differ, investigate each difference; one that turns out to be an artifact of scanning shipped JavaScript rather than source is listed in the script by name with its reason, never absorbed by loosening the comparison. Prove the check has teeth by breaking the `@source` paths once, and by dropping `tw-animate-css` once, and watching it fail each time, as the script's header records for its other checks.
- [x] `.storybook/preview.ts` keeps importing `src/styles/form-kernel.css`, because Storybook is a host without Tailwind. Update its comment, which explains the import as a substitute for the one the entries used to make.

## Phase 2: the documentation — done in df85e4c

- [x] `README.md`, run form section: replace the paragraph that says the stylesheet ships with this package and that a host adds no globs with a "Styling the form controls" section. For a Tailwind 4 host: the kernel's documented setup, linked at `https://github.com/Pipelex/mthds-form/blob/main/docs/theming.md`, with `@import "@pipelex/mthds-ui/tailwind.css";` in place of its `@source` line and no direct kernel dependency. For a host without Tailwind: `import "@pipelex/mthds-ui/form-kernel.css";` once. Never both. One sentence saying Tailwind 3 hosts and prefixed Tailwind 4 hosts are unsupported, and why. Keep the paragraph about complete colours for the shadcn tokens.
- [x] `README.md`, the run form example: import `getPipeIOContract` from `@pipelex/mthds-ui/form`, which re-exports the kernel, instead of from `@pipelex/mthds-form`. The example currently contradicts the paragraph just above it.
- [x] `README.md`, quick start and install: the quick start says `GraphViewer` handles styling, which stays true for the graph itself, since its own stylesheets are still imported by the entry. Add that the detail panel shows data through the form kernel's controls, whose styling the host sets up, with a pointer to the new section, and point to that section from the install section too, because it is now a setup step.
- [x] `docs/run-form-panel.md`, "Styling, and the trap in it": rewrite the part after the panel chrome. Keep the history short (v0.20.0 injected the sheet raw; v0.21.0 wrapped it in a layer; this release stops injecting it), replace the false paragraph with the design's explanation of why no single cascade position serves a host with Tailwind, then the two host lanes, then what not to do. The "What this means for you" paragraph tells a host not to add the kernel to its content globs, which is the opposite of the Tailwind 4 lane, and must go.
- [x] `docs/stuff-result-panel.md` and `docs/theming.md`: find and correct any sentence that says the entries bring the kernel's styling with them.
- [x] `CLAUDE.md`: in "CSS Packaging", add a paragraph for stylesheets a host imports itself (a copy in `onSuccess` and an `exports` entry, never an `external` pattern, and no JavaScript importer expected by `make smoke-pack`). Add `src/styles/` to the project structure tree with both files.
- [x] `CHANGELOG.md`: an Unreleased entry marked as breaking, following the workspace rule `.claude/rules/changelog.md` (at the workspace root; it loads when a changelog is edited), saying what each kind of host now loads and why the injection was removed.

## Checkpoint A: the package and its documentation

- [x] `make check && make test`, `make build`, `make smoke-pack`.
- [x] `grep form-kernel dist/graph/react/index.js dist/form/react/index.js` finds nothing, and `dist/styles/` holds both host stylesheets.
- [x] Storybook: open a `RunPanel` story and a story whose detail panel shows a structured result through `StuffResultPanel`, in both themes, with `/browse`, and confirm the controls are styled as they were. The styling lane there is unchanged, since Storybook imports the wrapper itself, so this checks that nothing else moved.
- [x] Update this plan: completed phases, the SHA they landed in, any difference the smoke oracle surfaced and how it was settled, and open questions.
- [x] `/rev`: profile 3, rounds 1 and 2, recorded below under "Checkpoint A review".

### Checkpoint A record

Phases 1 and 2 landed together in `df85e4c` on `feature/Kernel-layer-beats-v4`.

**Commands run at the checkpoint.** `make check` and `make test` passed. `make build` wrote both host stylesheets to `dist/styles/`, and `grep form-kernel dist/graph/react/index.js dist/form/react/index.js` found nothing. `make smoke-pack` passed, including the Tailwind 4 host under all three layouts. The standalone bundle still carries the kernel's sheet (`dist/standalone/graph-viewer.css` holds the kernel's `tailwindcss v4` banner and its utilities).

**What the smoke oracle surfaced.** Exactly one difference, identical under every layout: the kernel's prebuilt sheet carries `.contents { display: contents }` and the minimal host does not. The kernel builds its sheet by scanning its source tree, and the word "contents" appears only in comments in `src/react/result-field.tsx` and its tests; no file in the kernel's shipped JavaScript contains it, so no control can carry the class. It is listed by name, with that reason, in `SOURCE_ONLY_KERNEL_SELECTORS` in `scripts/smoke-pack.mjs`, and the script fails if the entry ever stops being a real difference. The comparison itself was not loosened. Compiling the host unminified produced dozens of spurious differences, all of them CSS nesting that the kernel's `--minify` build flattens, so the host is compiled with `optimize: { minify: true }` to compare like with like.

**The teeth, run against the real script.** Both `@source` paths broken: every kernel utility missing under npm hoisted, npm nested and pnpm. Only the nested path broken: the nested layout alone failed, so each candidate is the one its layout depends on. `tw-animate-css` dropped from the host: the enter and exit animation utilities (`animate-in`, `fade-in-0`, `zoom-in-95`, the `data-[state]` and `data-[side]` variants, and `running`) missing under every layout. The script's header records all three.

**Storybook.** `Form/RunPanel` (`Required And Optional`, dark, and `Light Theme`) and `Graph/Result panel` (`Light` and `Dark`, on the `Report` prose node and the structured `profile` node) were checked with gstack's headless browser: bordered and padded controls, rounded corners, the result grid resolving to two columns, and no console errors. Each was compared against a second Storybook on `dev` at `0e512be`, and the renders match, as they should, since the Storybook lane did not change.

**Decisions taken beyond the plan's letter.**

- The smoke check also runs the npm nested layout, reproduced by moving the hoisted kernel under the installed package, so the second `@source` candidate is proven end to end rather than only by the unit test's path arithmetic. The pnpm consumer is a sibling temporary directory, never a subdirectory of the npm one, so Node resolution cannot fall back to npm's hoisted tree.
- The formKernelLayer guard walks every shipped `.ts` and `.tsx` under `src/`, not only the two entries, since an import in a component would inject the sheet just as surely; it also asserts that `tailwind.css` holds nothing but its two `@source` lines, so no `@theme` block can arrive from the package.
- `"@pipelex/mthds-form/styles.css"` was also dropped from tsup's `external`: no JavaScript had imported that specifier since v0.21.0.
- Stale text found on the way was corrected in the same commit: the README's entry table (it said `./form/react` needs the kernel installed, and lacked `./form` and the stylesheets), the kernel import in `docs/run-form-panel.md`'s example, a "required peer" line in `docs/stuff-result-panel.md` and in `src/form/react/index.ts`, and in `CLAUDE.md` a deleted `stuffRender.ts`, `StuffResultPanel.tsx` listed under the wrong directory, workflow rule 8 describing a `renderStuffData` prop that no longer exists, and the standalone note saying that bundle has no form kernel. The comment on `ConceptDetailPanel`'s `renderData` pointed at the same deleted file. The `/bump-mthds-form` skill said this library imports the kernel's sheet and gained a row for the Tailwind 4 host lane, because a kernel bump is exactly what changes that check's result.

**Where the next session starts.** Checkpoint A's `/rev` has not run: the session that did Phases 1 and 2 reached its context wrap-up threshold, and the headroom guard refused the round. `ledger review-profile --target branch` resolved it as profile 3, round 1, bar `open`, fix mode `ask`: cubic, Codex in review mode, and the official `code-review` at level `low`, against `origin/dev`. A fresh session starts Claude Code in `/Users/lchoquel/repos/Pipelex/_mthds-ui--kernel-layer-beats-v4`, runs `ledger claim L-260925-7a8f98 --renew`, then `/rev`, triages and fixes what the bar admits, records the pass, and ticks the `/rev` box above. Phase 3 follows, per its own section. The pass records on L-260925-7a8f98 even though `review-profile` also lists L-260925-a49396 on this branch: that item was only filed from this worktree, and its fix belongs on its own branch.

**Open questions.**

- `docs/run-form-panel.md` names v0.25.0 as the release that stopped the injection, on the plan's premise that the release is the next minor. If the release number differs, that sentence changes with it. Source comments and the changelog name no future version.
- The Storybook pass found a pre-existing defect, unrelated to this change and identical on `dev`: in a dark graph the result panel's text keeps the light palette, because `StuffResultPanel` declares a `theme` prop and never reads it, so nothing applies the kernel's `.dark` class. Filed as L-260925-a49396, owned here.
- `make smoke-pack` now requires `pnpm` on the path. A release workflow that runs the smoke check would need `corepack enable` first; nothing in CI runs it today.

### Checkpoint A review

`/rev 3` reviewed `6f4e868` against `origin/dev` at round 1, bar `open`, with cubic, Codex in review mode and the official code-review at level `low`; one verifier checked what they raised. Codex and code-review reported nothing, the latter having read the source and config files only. cubic raised three findings, and the verifier confirmed all three.

- **Fixed in `48cc00e`: stale references to the result panel's old render prop.** `docs/stuff-result-panel.md` documented `renderStuffResult`, which no longer exists; the `input_form` fallback it described is reached through `GraphViewer`'s `inputForm` prop. The verifier found more of the same kind: two story titles the page named, the page's and `StuffResultPanel`'s claim that no storage resolver exists when `GraphViewer` has had `resolveUrl` since `724b172`, a story comment, and `GraphViewer`'s JSDoc still calling the kernel a required peer.
- **Fixed in `ff7eac4`: the token-fallback claim was false for the pinned kernel.** `form-kernel.css` and `docs/run-form-panel.md` said a host defining no tokens gets the light palette, which holds only from kernel `0.9.0`, while `^0.8.0` resolved to `0.8.0` alone. The kernel moved to `^0.11.0` through `/bump-mthds-form`. Its smoke host then surfaced two differences: `.static`, compiled from a kernel test file and now a named source-only selector, and the generative entry's `dark:block` / `dark:hidden` pair, which compiled under `prefers-color-scheme` because the documented Tailwind 4 setup never declared the `.dark` class variant. The host, the README and `docs/run-form-panel.md` now declare it, and the kernel-side causes are filed as L-260925-5ec39b. Kernel `0.11.0` also stops drawing a dropzone for a file field with no upload path, so the `File Input` story gained an `uploadFile` and `File Input Without Upload` asserts the link-only lane.
- **Deferred, verified: the smoke host scans its own program.** `scripts/smoke-pack.mjs` passes `base: consumer` to the Tailwind plugin, and with no `source(...)` on the host's `@import "tailwindcss"`, automatic source detection reads `**/*` under the consumer, which includes the generated host program. The verifier measured it with `@tailwindcss/postcss` 4.3.3: the leak compiles exactly one kernel selector, `.inline`, from the program's `"@theme inline {"` text, and the kernel's shipped JavaScript produces `.inline` anyway, so no result depends on it today; with both `@source` paths broken, every other selector still goes missing. It would matter if the program text gained more utility-shaped words, or if the kernel's JavaScript stopped containing "inline" while its source kept it. The fix is to point `base` at an empty directory, or one holding only `host.css`, while keeping `from: hostFile` so the kernel's stylesheet still resolves; the header's "every kernel utility missing" should then allow for `.contents` and `.static`.

**Open questions it left.**

- `StuffResultPanel` installs the kernel's `ResultEnvProvider` with `resolveUrl` and `resolveShareUrl` only, so a `GraphViewer` host cannot pass the kernel's `proseImages` (images in prose now render as links until a host opts in) or `tableColumns` (result tables now show five columns). Whether the viewer should forward them is a product question for the next change to the panel.
- The Storybook pass saw the dark result panel's text keep the light palette, which is the pre-existing `theme` defect recorded above, unchanged by the bump.

### Checkpoint A review, round 2

`/rev 3` reviewed `0aefba5` against `origin/dev` at round 2, bar `defects`, with the same three reviewers and one verifier. code-review reported nothing, again having read only the source and config files. Codex raised one finding. cubic raised three, one of them round 1's deferral again.

- **Fixed in `014bcf1`: the React peer floor.** Kernel `0.9.0` brought in `@json-render/react`, whose only peer is `react ^19.2.3`, while this package and the kernel both advertised `^19`. The verifier measured a host pinning React 19.1.0:
  - default npm warns `ERESOLVE` and installs one React;
  - `--strict-peer-deps` fails the install;
  - pnpm reports the unmet peer;
  - nothing breaks at runtime, since only the kernel's `./generative` entry loads json-render.

  Codex's claim of a second React copy was refuted. The peers moved to `^19.2.3` here, and the kernel's side is L-260925-829b91. If the kernel takes `@json-render` off its main entries, this floor can come down at the next bump.
- **Fixed in `e610877`: the release skill's description of the smoke gate.** It said every exported stylesheet is imported by the JS that needs it, which is the inverse of what the gate now asserts for the two host stylesheets. It named neither the Tailwind 4 host check nor its pnpm requirement, and it called the toolchain "npm throughout".
- **Fixed in `b02ff19`: `tailwind.css`'s claim to cover every layout.** The README, `docs/run-form-panel.md` and the file's own comment said one of the two paths finds the kernel whichever layout a package manager chose. The verifier built a counter-example with npm workspaces: two apps pinning versions of this package that share a kernel range, one copy of this package nested under its app, and the kernel hoisted to the root. That host compiled none of the kernel's utility selectors, with no warning, and one `@source` line in the host fixed it. The docs now name that layout and the remedy.
- **Deferred, verified, an improvement: resolve the kernel instead of guessing its path.** In scratch, the verifier replaced `tailwind.css` with `@config "./kernel-source.config.mjs"`. That config resolves `@pipelex/mthds-form/styles.css` through `createRequire(import.meta.url)` and returns `content: [<kernel dist>/**/*]`, and the nested layout then compiled every selector. A glob of `**/*.js` alone left 8 missing, because the kernel's non-JS files under `dist` also carry class names. The approach depends on Tailwind 4's legacy `@config` path, and the smoke check would have to cover the nested-below-hoisted layout, so it is a design change for later rather than a fix for this round.
- **Still deferred: the smoke host scans its own program.** cubic raised round 1's deferral again, unchanged, and the trace under "Checkpoint A review" stands.
- **A side note from the verifier.** `smoke-pack` tells a machine without pnpm to run `corepack enable`, which holds on Node 22 and 24, the versions `engines` and CI use. Node 25 and later no longer bundle corepack. The release skill now says so, and the script's message could say so too.

## Phase 3: proof in real hosts

Nothing in this phase is committed to another repository. It uses a throwaway worktree of each host, never a branch another session holds. The smoke check has already proved the documented setup on a minimal host; this phase proves the change against real applications.

- [ ] A Tailwind 4 host application: install the packed tarball, replace the host's `@source` path, its direct kernel declaration and its `@layer mthds-form;` statement with `@import "@pipelex/mthds-ui/tailwind.css";`, and build. Compare the set of utility selectors in the compiled CSS before and after: every kernel class the host compiled before must still be there. Confirm that the graph chunk carries no kernel sheet. At 375, 768 and 1280 pixels, confirm the responsive layout holds before and after a graph mounts and the form controls look as they did.
- [ ] The VS Code extension's webview, a host without Tailwind: build it against the tarball with the one import added and confirm the controls are styled, then without it and confirm they are unstyled.
- [ ] Record the results at the checkpoint below, with the commands run.

## Checkpoint B: ready to release

- [ ] Update this plan with Phase 3's results and anything it changed in Phases 1 and 2.
- [ ] `/rev` if Phase 3 changed code.
- [ ] Open the pull request `feature/Kernel-layer-beats-v4 · L-260925-7a8f98` into `dev`, with `Closes L-260925-7a8f98` in its body.
- [ ] After the merge, the release is cut with `/release` as a minor version, since the change is breaking. That release unblocks L-260925-226ec9, L-260925-235cfe and L-260925-43ced4.
