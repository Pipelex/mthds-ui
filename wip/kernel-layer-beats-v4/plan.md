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

## Phase 1: the package

- [ ] Remove `import "../../styles/form-kernel.css";` from `src/graph/react/index.ts` and `src/form/react/index.ts`. Rewrite both block comments to say that the entries import no kernel stylesheet on purpose and that the host loads what its kind of host needs, with a pointer to the README section. Keep the short history of why v0.20.0 made the import this package's job, because it is what a future reader will be tempted to restore, and say why it was undone.
- [ ] Rewrite the header comment of `src/form/react/RunPanel.css`, which says both entries import the kernel's sheet and the host adds nothing.
- [ ] Add `src/styles/tailwind.css`, holding `@source "../../../mthds-form/dist";` and `@source "../../node_modules/@pipelex/mthds-form/dist";`, both relative to where the file lands at `dist/styles/`. Its comment says which install layout each path serves (a pnpm virtual store or a hoisted npm tree for the first, npm nesting the kernel under this package for the second), that Tailwind resolves the file to its real path before resolving them, that a path that does not exist is skipped silently, which is why both are listed, and that this file replaces only the `@source` line of the kernel's documented setup.
- [ ] Rewrite the comment in `src/styles/form-kernel.css`: it is the sheet for a host without Tailwind, imported once by that host; its preflight resets every browser default the host does not restate; the layer lets the host's own rules win ties against the kernel's utilities; a host with Tailwind 4 uses `tailwind.css` instead and must not import this one.
- [ ] `tsup.config.ts`: drop `/styles\/form-kernel\.css$/` from `external`, since no JavaScript imports it any more, and copy `src/styles/tailwind.css` to `dist/styles/tailwind.css` in `onSuccess` beside the existing copy of `form-kernel.css`.
- [ ] `package.json` `exports`: add `"./tailwind.css": "./dist/styles/tailwind.css"` and `"./form-kernel.css": "./dist/styles/form-kernel.css"`.
- [ ] `scripts/standaloneCssFiles.mjs` and its `.d.mts`: remove the alias from `src/styles/form-kernel.css` to the kernel's sheet, which only existed because the graph entry imported the wrapper. If no alias remains, remove the aliasing mechanism from `src/standalone/__tests__/cssManifest.test.ts` too rather than leaving it unused. The manifest's own entry for `node_modules/@pipelex/mthds-form/dist/styles.css` stays, since the standalone bundle is a host without Tailwind.
- [ ] `src/styles/__tests__/formKernelLayer.test.ts`: invert the entry assertion so that no React entry imports any kernel stylesheet, neither `@pipelex/mthds-form/styles.css` nor the wrapper. Keep the assertions that the wrapper is layered and does not import `theme.css`. Assert that `tailwind.css` carries both `@source` candidates, and that each one, resolved from `node_modules/@pipelex/mthds-ui/dist/styles/`, lands on the kernel's `dist` for the layout it serves. Rewrite the file's header, which restates the claim the design shows is false.
- [ ] `scripts/smoke-pack.mjs`, the host-imported stylesheets: the check that every exported stylesheet is imported by the JavaScript that needs it learns that `tailwind.css` and `form-kernel.css` are imported by the host by design, and asserts instead that no JavaScript in the package imports either.
- [ ] `scripts/smoke-pack.mjs`, the minimal Tailwind 4 host, as the design's "Guards" section specifies. Install the tarball into a bare consumer twice, once with npm and once with pnpm; both are required, and the script fails with a message naming `corepack enable` when `pnpm` is not on the path. In each, install `tailwindcss`, its PostCSS plugin and `tw-animate-css`, and compile a stylesheet that is the kernel's documented setup and nothing more: `@import "tailwindcss"`, `@import "tw-animate-css"`, `@import "@pipelex/mthds-ui/tailwind.css"`, and an `@theme inline` mapping whose keys are derived from the token names the kernel's shipped `theme.css` defines, plus the `--radius-lg`, `-md` and `-sm` keys, so that the check follows the kernel rather than a list in the script. The oracle is the kernel's shipped `styles.css`: every selector in its `utilities` layer must appear in the output. If the two sets differ, investigate each difference; one that turns out to be an artifact of scanning shipped JavaScript rather than source is listed in the script by name with its reason, never absorbed by loosening the comparison. Prove the check has teeth by breaking the `@source` paths once, and by dropping `tw-animate-css` once, and watching it fail each time, as the script's header records for its other checks.
- [ ] `.storybook/preview.ts` keeps importing `src/styles/form-kernel.css`, because Storybook is a host without Tailwind. Update its comment, which explains the import as a substitute for the one the entries used to make.

## Phase 2: the documentation

- [ ] `README.md`, run form section: replace the paragraph that says the stylesheet ships with this package and that a host adds no globs with a "Styling the form controls" section. For a Tailwind 4 host: the kernel's documented setup, linked at `https://github.com/Pipelex/mthds-form/blob/main/docs/theming.md`, with `@import "@pipelex/mthds-ui/tailwind.css";` in place of its `@source` line and no direct kernel dependency. For a host without Tailwind: `import "@pipelex/mthds-ui/form-kernel.css";` once. Never both. One sentence saying Tailwind 3 hosts and prefixed Tailwind 4 hosts are unsupported, and why. Keep the paragraph about complete colours for the shadcn tokens.
- [ ] `README.md`, the run form example: import `getPipeIOContract` from `@pipelex/mthds-ui/form`, which re-exports the kernel, instead of from `@pipelex/mthds-form`. The example currently contradicts the paragraph just above it.
- [ ] `README.md`, quick start and install: the quick start says `GraphViewer` handles styling, which stays true for the graph itself, since its own stylesheets are still imported by the entry. Add that the detail panel shows data through the form kernel's controls, whose styling the host sets up, with a pointer to the new section, and point to that section from the install section too, because it is now a setup step.
- [ ] `docs/run-form-panel.md`, "Styling, and the trap in it": rewrite the part after the panel chrome. Keep the history short (v0.20.0 injected the sheet raw; v0.21.0 wrapped it in a layer; this release stops injecting it), replace the false paragraph with the design's explanation of why no single cascade position serves a host with Tailwind, then the two host lanes, then what not to do. The "What this means for you" paragraph tells a host not to add the kernel to its content globs, which is the opposite of the Tailwind 4 lane, and must go.
- [ ] `docs/stuff-result-panel.md` and `docs/theming.md`: find and correct any sentence that says the entries bring the kernel's styling with them.
- [ ] `CLAUDE.md`: in "CSS Packaging", add a paragraph for stylesheets a host imports itself (a copy in `onSuccess` and an `exports` entry, never an `external` pattern, and no JavaScript importer expected by `make smoke-pack`). Add `src/styles/` to the project structure tree with both files.
- [ ] `CHANGELOG.md`: an Unreleased entry marked as breaking, following the workspace rule `.claude/rules/changelog.md` (at the workspace root; it loads when a changelog is edited), saying what each kind of host now loads and why the injection was removed.

## Checkpoint A: the package and its documentation

- [ ] `make check && make test`, `make build`, `make smoke-pack`.
- [ ] `grep form-kernel dist/graph/react/index.js dist/form/react/index.js` finds nothing, and `dist/styles/` holds both host stylesheets.
- [ ] Storybook: open a `RunPanel` story and a story whose detail panel shows a structured result through `StuffResultPanel`, in both themes, with `/browse`, and confirm the controls are styled as they were. The styling lane there is unchanged, since Storybook imports the wrapper itself, so this checks that nothing else moved.
- [ ] Update this plan: completed phases, the SHA they landed in, any difference the smoke oracle surfaced and how it was settled, and open questions.
- [ ] `/rev`.

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
