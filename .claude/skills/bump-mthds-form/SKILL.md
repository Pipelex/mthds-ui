---
name: bump-mthds-form
description: Bump the @pipelex/mthds-form optional peer dependency in mthds-ui to a newer published version. Reads the form kernel's CHANGELOG.md for the versions in between, checks each change against the seams this library consumes (the gate in src/form/runGate.ts, the controls in RunPanel.tsx, the tsup externals, the Storybook styling lane, the generated contracts fixtures), moves BOTH the peerDependencies and devDependencies ranges, honours the pending S2 contracts-reshape obligation, runs check/test/smoke-pack, and prepares a reviewable commit. Use whenever the user says "bump mthds-form", "bump the form kernel", "update @pipelex/mthds-form", "upgrade the form package", "is there a new mthds-form version", "pull in the new kernel", or asks to move this repo onto a newer form-kernel release — and reach for it too when someone asks whether RunPanel is on the latest kernel.
---

# Bump `@pipelex/mthds-form`

`@pipelex/mthds-form` is pre-1.0, so a `^0.x.y` range only auto-resolves patch bumps — npm treats the leading `0` as the major. A new minor (`0.2.0 → 0.3.0`) needs this repo's `package.json` edited by hand, deliberately: read what changed, apply what can be applied mechanically, verify, hand the user a reviewable commit.

This is the sibling of `pipelex-starter-js`'s skill of the same name, and the staged-confirmation style is the same — every step that edits files or runs `npm install` is visible before moving on. **What differs is that this repo is a library, not an app**, and that changes three things fundamentally:

1. **There are two version sites, not one.** The kernel is an _optional peer dependency_ (`peerDependencies` + `peerDependenciesMeta.optional`) **and** a `devDependency` for local work. The dev range is what `make check`/`make test` actually run against; the peer range is what a downstream host resolves. Moving one without the other produces a green suite that lies.
2. **Moving the peer range is a breaking change for consumers of `@pipelex/mthds-ui`.** A host pinned to `^0.2.0` cannot satisfy `^0.3.0`. That earns a changelog bullet in this repo's own terms — the starter app never faces this, because it has no consumers.
3. **There is an owed follow-up waiting on a specific kernel release** — the S2 contracts reshape, Step 6. It is the one step in this workflow that can quietly corrupt the fixture tree if taken at the wrong moment, so read that step before touching `make fixtures-contracts` for any reason.

Don't assume the sibling `../mthds-form` checkout exists — always keep the GitHub-raw fallback ready.

## Step 1 — Gather state

Show the user:

1. The peer range: `node -p "require('./package.json').peerDependencies['@pipelex/mthds-form']"`
2. The dev range: `node -p "require('./package.json').devDependencies['@pipelex/mthds-form']"`
3. What is actually installed: `node -p "require('./node_modules/@pipelex/mthds-form/package.json').version"`
4. The latest published version: `npm view @pipelex/mthds-form version`
5. Working tree status (`git status --short`)

**The two ranges should be identical.** If they have drifted, say so before doing anything else — a previous bump moved one and forgot the other, and the answer to "what version is this repo on?" depends on who is asking. Fix that as part of this bump.

There is no `make use-local` / `make use-npm` lane in this repo, so a mismatch between the installed version and the ranges means someone linked or hand-installed a build. Flag it and offer `npm install` to return to a clean baseline before bumping.

A dirty tree is not a blocker — `make check` doesn't require a clean one — but note it, since your diff lands alongside whatever is already in flight. Ask before editing `package.json` / `package-lock.json` if either is already dirty.

## Step 2 — Determine the target version

If the ranges already admit the latest, say there's nothing to bump and stop (unless the user explicitly wants to re-pin).

Otherwise use `AskUserQuestion`:

- **Latest (`{npm view version}`)** — the default, recommended path.
- **A specific version** — a version between current and latest, or one published but not yet indexed.

Store it as `TARGET_VERSION` (no `v` prefix, e.g. `0.3.0`). Warn on a downgrade and confirm it's intended.

## Step 3 — Read what changed, against this repo's seams

Get the kernel's `CHANGELOG.md` entries for every version strictly after the current one through `TARGET_VERSION`, from whichever source is available:

1. **Local sibling checkout** — `../mthds-form/CHANGELOG.md`. Fast, offline, canonical when present.
2. **GitHub raw** — `https://raw.githubusercontent.com/Pipelex/mthds-form/main/CHANGELOG.md` (repo confirmed via `npm view @pipelex/mthds-form repository.url`). Don't assume the npm tarball ships a changelog.

Present the entries grouped by version, newest first.

**This changelog has no "Breaking —" marker convention.** It writes `### Added` / `### Changed` / `### Fixed` with a bold lead phrase per bullet and flags impact in prose — "visible on the wire", a renamed export, a changed default, a control that now renders differently. So don't scan for a marker; read each bullet against the seams below and call out every one that lands on them.

| Seam                                 | Where it lives                                                                                                                                                                              | What a kernel change does to it                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| ------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **The submit gate**                  | `src/form/runGate.ts` — `buildRunInputsSchema`, `prepareRunInputs`, `validateRunInputs`, `apiInputsFromSchemaData`, `rjsfDataFromRunValues`, `describeValidationError`                      | This module only sequences the kernel's four steps. A signature change breaks the build loudly; a _semantics_ change shows up as a red assertion in `src/form/__tests__/runGate.test.ts`, which runs the real kernel over real contracts.                                                                                                                                                                                                                                                                                             |
| **The wire format**                  | the same test — it asserts the two documented exceptions (blank optionals omitted, empty plurals shipped bare)                                                                              | Unlike the starter app, this library never executes a run, so there is no e2e lane. The node test _is_ the wire check, and it is a real one.                                                                                                                                                                                                                                                                                                                                                                                          |
| **Readiness and the controls**       | `src/form/react/RunPanel.tsx` — `computeReadiness`, `fieldsForContract`, `isFilled`, `setValueAtPath`, and `FieldRenderer` / `OptionalToggle` / `FieldEnv` from `@pipelex/mthds-form/react` | Rendering changes break Storybook play functions, which query by role plus accessible name. `RunPanel.stories.tsx` is large, and the panel sets neither a presentation nor field strings — so its selectors ride on the kernel's **defaults**: `studio`, which shows a field's identifier verbatim (`getByLabelText(/style_hint/i)`), and the built-in English copy behind the optional toggle (`getByRole("button", { name: /optional input/i })`). A release changing either default breaks selectors without a line changing here. |
| **The packaging contract**           | `tsup.config.ts` `external` array, `eslint.config.mjs` `no-restricted-imports`, `scripts/smoke-pack.mjs`                                                                                    | A kernel release that adds an entry point (a third specifier beside `.` and `./react`) needs that specifier added to tsup's externals, or it gets **bundled** — a second React context identity, which is the exact failure the optional-peer arrangement exists to prevent. The eslint patterns already cover `@pipelex/mthds-form/*`.                                                                                                                                                                                               |
| **The Storybook styling lane**       | `.storybook/preview.ts` imports `theme.css` + `styles.css`; `.storybook/main.ts` names both specifiers in `optimizeDeps.include`                                                            | Storybook here takes the kernel's prebuilt lane (lane 2 of `docs/run-form-panel.md`). A moved or renamed CSS entry point makes the stories render unstyled and _still pass_. A new entry point imported by a story and missing from `optimizeDeps.include` fails story tests with "Failed to fetch dynamically imported module" — the reason that list exists is written in the file.                                                                                                                                                 |
| **The generated contracts fixtures** | `src/form/react/__stories__/contracts/_generated/**` — every split imports `type PipeIOContracts` from the kernel                                                                           | **Never hand-edited.** A rename or reshape here routes through `make fixtures-contracts`, under the conditions in Step 6.                                                                                                                                                                                                                                                                                                                                                                                                             |
| **The published docs**               | `docs/run-form-panel.md`, `README.md`                                                                                                                                                       | Both document the kernel's surface for hosts: `getPipeIOContract`, the two mutually-exclusive CSS lanes, the `.dark` bridge, the `mthds-run-panel` token hook. If the kernel moved any of them, the doc is wrong the moment the bump lands.                                                                                                                                                                                                                                                                                           |

Everything else — internal refactors, additions this library doesn't consume, kernel-side docs — is FYI. Mention briefly, don't dwell.

## Step 4 — Apply what's mechanical

For each bullet renaming an identifier written as `` `oldName` `` → `` `newName` `` (an export, an option, a CSS entry, a type):

1. **Grep the whole repo**, not just `src/`. Kernel names leak into `README.md`, `CLAUDE.md`, `docs/run-form-panel.md`, `tsup.config.ts` comments, `eslint.config.mjs` messages, `.storybook/*`, `scripts/smoke-pack.mjs`, and the `wip/adopt-form/` design notes. Three places to leave alone:
   - `CHANGELOG.md`'s **already-dated release entries** (`## [vX.Y.Z] - YYYY-MM-DD`) — a historical record. Step 8 adds this change's entry under `## [Unreleased]`.
   - **`src/form/react/__stories__/contracts/_generated/`** — generated; see Step 6.
   - **`data/mthds-corpus/`** — a vendored copy owned by `pipelex`; editing it forks it.
2. **If found**: apply the migration with `Edit` and show the diff. This matches the workspace's "no backward-compatibility shims — just change it" principle.
3. **If not found**: say so and move on. This library consumes a deliberately narrow slice of the kernel, so "we never used that surface" is the common and correct answer.
4. **Run `make format` right after any rename.** A literal find-and-replace changes string lengths, and Prettier re-flows what it touches — a raw rename inside a Markdown table fails `make format-check` purely on column padding, which reads as a baffling false alarm if you hit it without knowing the rename caused it.

Most of this kernel's changelog is not renames — it's behaviour: a gate that prunes differently, a value bridge that wraps a scalar it didn't before, a control that renders as a switch instead of a card. **Never guess at those.** List them as a "needs manual review" checklist and let the user decide how (or whether) this repo adapts. Say explicitly which ones you expect to turn `make test` red, so Step 5's failures read as predicted rather than mysterious.

### Reading a red test

When a kernel _fix_ changes behaviour this repo's tests assert on, a failure has **three** possible readings, and they take different fixes:

1. **The kernel legitimately changed and our assertion is stale** — update the assertion.
2. **We broke something** — fix our code.
3. **The kernel change moved which of our code paths runs, and exposed a latent defect here that neither side's tests could see before.** Fix our code — and note that the tempting repair is to adjust the story's input data until the old path runs again, which re-hides the bug permanently.

Decide by the changelog bullet, not by which edit makes the suite green faster. The third reading is the one worth slowing down for, and it is not hypothetical — the `0.2.0 → 0.3.0` bump produced exactly one, which is worth carrying as the worked example:

> `HostTranslatesTheErrorSummary` went red asserting the host's `translate` reached the error summary. The cause was not the kernel. `summarizeVerdict` in `src/form/runGate.ts` had two branches, and **only the fallback one passed `t` through** — the `missingInputs` branch returned a hardcoded English `` `Missing required fields in: …` ``. Under `0.2.0` that story's malformed input produced an empty `missingInputs`, so it exercised the translated fallback; under `0.3.0` the validator names the input (`["invoice"]`), the first branch runs, and the untranslated line surfaced. The story existed _specifically_ to cover the i18n seam and had never once exercised the branch that breaks it.
>
> **That defect is fixed** — `e351609` routes all three branches through `t`, which is why the bump to `0.3.0` later landed green on this story. It is kept here as the worked example of reading #3, not as a live warning: the shape recurs, the instance does not.

The workspace principle applies here — flag and fix pre-existing bugs you find, even outside the bump's scope. Say plainly that the bump revealed it rather than caused it, so the changelog entry attributes it correctly.

## Step 5 — Apply the bump and run the checks

1. Edit **both** `"@pipelex/mthds-form"` lines in `package.json` — `peerDependencies` and `devDependencies` — to `"^{TARGET_VERSION}"`. Keep the caret style; don't switch to an exact pin, and don't widen to `"^0.2.0 || ^0.3.0"` (the code can only be written against one shape, and the workspace runs no deprecation windows).
2. `npm install` — not `--package-lock-only`. Storybook's prebuilt CSS lane and the smoke test read the installed `dist/`, not the manifest.
3. Confirm: `node -p "require('./node_modules/@pipelex/mthds-form/package.json').version"` reads `TARGET_VERSION`.
4. Run `make check && make test`. The node project runs the real gate over real contracts; the browser project runs the form stories against the kernel's real controls.

On failure, show the errors and connect them to the Step 4 checklist rather than dumping output. Ask how to proceed — fix, skip, abort.

## Step 6 — The contracts fixtures: an owed step, and a foot-gun

Read `wip/adopt-form/contracts-fixture-reshape-obligation.md` before deciding anything here. The short version:

`pipelex` PR #1149 reshaped `pipe_io_contracts` — an input's boolean `optional` became a three-valued `presence`, and `multiplicity` gained a `fixed` arm carrying `item_count`. The fixtures in this repo are **pre-reshape**, and so was the kernel at `0.2.0`. They agree, which is exactly what hides the problem: nothing here can go red on its own.

The local pipelex venv is an _editable_ install pointing at the sibling checkout, so it already emits the new shape regardless of what version number it reports. **That makes `make fixtures-contracts` a live foot-gun**: run for any reason, it silently reshapes every fixture it re-sources, in front of a kernel that may still read `optional` — the failure mode being that every `?` input becomes required, silently, because `undefined !== true`.

So:

1. **Determine whether `TARGET_VERSION` takes the reshape.** The changelog is the first read, but ask the installed artifact rather than trusting that someone wrote a bullet — after Step 5's install, one grep settles it:

   ```bash
   grep -rho "optional !== true\|\.presence\|item_count" node_modules/@pipelex/mthds-form/dist/ | sort | uniq -c
   ```

   `optional !== true` still present and no `presence` means the kernel is **pre-S2**, whatever the changelog says or omits. (Measured at `0.3.0`: four occurrences of `optional !== true`, no `presence` — pre-S2, so the obligation was still owed and the fixtures were left alone.)

2. **If it does**: regenerate in this same change. `make fixtures-contracts` is offline and fast. Then re-run `make check && make test` — expect the OPTIONAL-input stories to be where breakage shows (`village_noticeboard.draft_notice` is the fold case, and the two vendored corpus entries are in the sweep precisely because the pipeline corpus has no OPTIONAL input anywhere).
3. **If it does not**: **do not regenerate.** Say so explicitly in your summary, so the next person doesn't read the silence as "already handled". If you need the fixture modules rebuilt for an unrelated reason, `--from-disk` is the one contracts invocation that re-sources nothing and therefore cannot trip this.

Before trusting any regeneration, the doc's own check tells you what the interpreter will emit — a version number will not:

```bash
../pipelex/.venv/bin/python -c "from pipelex.pipeline.pipe_io_contracts import PipeInputContract; print(list(PipeInputContract.model_fields.keys()))"
```

If `presence` is in that list and the kernel is still pre-S2, do not refresh.

When the obligation is discharged, delete `wip/adopt-form/contracts-fixture-reshape-obligation.md` in the same commit — a satisfied obligation left lying around gets re-satisfied by the next reader.

## Step 7 — Prove the packaging contract, and look at the form

Two checks `make check` cannot perform, both worth their minutes on a kernel bump:

**`make smoke-pack`** — always. It packs the tarball and installs it into a consumer that deliberately has **no** kernel installed, which is the only vantage point from which the export map, the externals and the `"use client"` directives are observable at all. Run it whenever the kernel's entry points, exports, or peer metadata are in play — which a version bump puts in play by definition. If the kernel added an entry point you forgot to mark external in `tsup.config.ts`, this is what catches it.

**A visual pass in Storybook** — whenever a changelog bullet touches the controls, the CSS entries, or Tailwind classes. This repo's Workflow Rule 2 already demands visual verification for rendering changes, and a form-styling regression is the silent kind: the panel still renders, just subtly unstyled, and it reads like someone broke the design system rather than like a missing stylesheet. `make storybook` (port 6006), then the `RunPanel` and `GraphWithRunPanel` stories, in both themes. Use the `/browse` skill rather than claiming it from tests.

## Step 8 — Update `CHANGELOG.md` and the docs

This repo keeps an `## [Unreleased]` section at the top of `CHANGELOG.md`; the `release` skill consumes it. Add or extend a `### Changed` bullet there. At minimum:

```markdown
- Bumped `@pipelex/mthds-form` to `{TARGET_VERSION}` (was `{OLD_VERSION}`), in both the peer range and the dev range.
```

Then add what a _consumer of this library_ would notice, written in this repo's terms rather than copied from the kernel's changelog — the reader has never looked at the kernel's:

- **The peer range moved, and that is breaking for hosts.** A host on the old range must bump too; caret ranges below 1.0 do not bridge a minor. Say it plainly.
- **A control that renders differently, a field that becomes runnable, a wire shape a host's own API logs would show** — restate it as "what changes for someone rendering `RunPanel`".
- **A token or CSS entry that moved**, since hosts on the prebuilt lane import those by name.

Match the surrounding entries' voice: a bold lead phrase, then prose explaining what changed and why it matters. And per the workspace writing rules, "breaking" — never "pre-1.0 breaking".

If the bump changed anything `docs/run-form-panel.md` or `README.md` states about the kernel — the surface, the two CSS lanes, the `.dark` bridge, the `mthds-run-panel` hook — update them in this same change. The workspace rule is to document at every iteration, and a doc describing the previous kernel is worse than no doc.

## Step 9 — Review and commit

Present a full summary:

- `@pipelex/mthds-form`: `{OLD_VERSION} → {TARGET_VERSION}`, both ranges
- Files changed: `package.json`, `package-lock.json`, `CHANGELOG.md`, plus Step 4's migrations, plus any regenerated contracts fixtures, plus any docs
- Whether the contracts obligation was discharged, deferred, or not applicable — and why
- Whether `make smoke-pack` passed, and whether Storybook was looked at
- Any unresolved "needs manual review" items

Ask the user to confirm. On confirmation:

1. Stage only the files this bump touched — never `git add .` or `git add -A`. If the tree already had unrelated changes to one of them (flagged in Step 1), stage hunks carefully or ask how to separate them.
2. Commit: `Bump @pipelex/mthds-form to {TARGET_VERSION}`, with a short body naming any migrations applied or fixtures regenerated.
3. Show the result.

Then **offer** pushing and opening a PR — target branch `dev` per the workspace's git conventions. Wait for explicit approval before either.

## Rules

- Move **both** ranges — the peer range and the dev range — or the suite passes against a version consumers cannot resolve.
- Never use `git add .` or `git add -A`; stage only what this bump touched.
- Never push or open a PR without explicit approval, and never merge one.
- Never guess at a fix for a behaviour change (gate semantics, wire shapes, rendering) — flag it and let the user decide.
- Never hand-edit `src/form/react/__stories__/contracts/_generated/` or anything under `data/mthds-corpus/`.
- Never run `make fixtures-contracts` outside the conditions in Step 6.
- Don't assume the sibling `../mthds-form` checkout exists — keep the GitHub-raw fallback ready.
- If a step fails or the user wants to abort, stop immediately rather than continuing the workflow.
