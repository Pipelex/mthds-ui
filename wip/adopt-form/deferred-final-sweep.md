# Deferred — the final cold sweep

The last independent review before merge, run with no inherited context across a structured pass, a Claude adversarial pass, a Codex pass, a packaging pass, a mutation-testing pass and a maintainability pass. What it found and I acted on is in `CHANGELOG.md` and the round write-ups in `TODOS.md`. This note is what it found and I deliberately did **not** act on, with enough evidence that the next session does not have to re-derive any of it.

Two of these are more valuable as records than as tasks, because they carry counter-evidence: the obvious fix is wrong, and knowing that is the point.

## 1. The dead `dist/graph/react/index.css` — and why the obvious fix breaks the build

Pre-existing, not introduced by this branch. Three graph stylesheets have **two** importers each with **different specifiers**: the barrel writes `"./detail/DetailPanel.css"` (which the `external` regex `/detail\/DetailPanel\.css$/` matches, so it survives as an import and `onSuccess` copies the file), while the component itself writes `"./DetailPanel.css"` (which that regex does not match, so tsup bundles it). The bundled copies land in `dist/graph/react/index.css` — a file no JS imports and no `exports` entry points at, so it is unreachable through the package's public API. With its sourcemap it is roughly 65 kB of dead weight in every tarball. The sourcemap is the authority on what went in: `dist/graph/react/index.css.map`'s `sources` names exactly `StuffViewer.css`, `DetailPanel.css` and `GraphToolbar.css`.

**The fix `CLAUDE.md` literally prescribes makes it worse.** Adding the basename form `/DetailPanel\.css$/` was built and measured: `index.css` disappears, and `dist/graph/react/index.js` gains **five unresolvable imports** — `./DetailPanel.css` three times, `./StuffViewer.css`, `./GraphToolbar.css`. esbuild emits an external specifier verbatim from the module it appeared in, so once the components are inlined into the barrel, `./` means `dist/graph/react/` — and those files live in `detail/`, `stuff/` and `viewer/`. That trades dead bytes for a consumer build that cannot resolve its own stylesheets.

So the path-shaped regexes are **load-bearing, not sloppy**, and `RunPanel.css` is correct only because it has a single importer co-located with its entry. Whoever picks this up needs to change the component-side specifiers or the emitted layout, not the regex. Worth recording too: `CLAUDE.md`'s CSS rule and its verification step (grep the barrel, check the file exists) are both blind to this case, which is how it survived.

## 2. The `.then(onFulfilled, onRejected)` shape has no regression story

The two-argument form is what keeps a write-back `TypeError` from being swallowed — the one failure in the upload lifecycle with no diagnostic surface at all. A mutation pass restructured it back to `.then(…).catch(…)` and **all** the RunPanel stories stayed green, so it is the only fix in this eleven-round lifecycle that was never pinned red-then-green.

Not written now because the observable difference is an _unhandled rejection_, and a browser story that synchronises on `window.onunhandledrejection` is exactly the kind of harness that becomes flaky and then gets deleted. The case to pin is a host `uploadFile` that resolves to `undefined` (the forgotten `return` the code comment describes). Worth doing with a deliberate design, not bolted on at the end of a review.

## 3. The values mirror's layout timing is unpinned

`React.useLayoutEffect(() => { valuesRef.current = values; }, [values])` can be downgraded to `useEffect` with every story still green. The generation marker's twin **is** pinned (`UploadDiscardedBeforeEffectsFlush` fails when downgraded), so the harness can see this class of timing defect; it simply is not aimed at this ref. Round 6's write-up argues both must be layout effects, and it is right — the cost here is the host's newer edits being overwritten rather than an upload landing in the wrong pipe, which is quieter and therefore worse to leave unguarded. The existing story machinery (a timer-scheduled update, settling an upload from a layout effect) is what a test would reuse.

## 4. `make smoke-pack` is not invoked by any workflow

`quality-checks.yml` runs `make check` and `make test`; `release.yml` runs check → test → build → a `dist/standalone` existence check → publish. Nothing runs the packaging smoke test, so the one guard proving the export map, the externals, the `"use client"` directives and the optional-peer isolation is guarded by someone remembering. Keeping it out of `make check` is right — it builds, packs and installs — but `release.yml`, on a job that already builds, is the obvious home.

Deferred rather than done because it changes release mechanics: the step installs a tarball into a scratch consumer, and a step that can fail for network reasons sitting in front of `publish` is a decision about release risk, not a review fix. It belongs to whoever owns the release, and `/release` is where it should be raised.

## 5. Export condition order in `package.json`

Every entry lists `"import"` before `"types"`, including the new `./form/react`. Verified not to break: a kernel-less consumer typechecks clean under both `bundler` and `node16` resolution, via the sibling-`.d.ts` fallback. It is a publint-level convention (types first), pre-existing across every entry, with no observable effect today. Fold it into a change that is already touching the export map.

## 6. Comment and harness duplication

None of these is a defect; all of them are the shape that _becomes_ one, and this branch has now been bitten four times by a claim stated in two places drifting apart (rounds 13, 14, 17, 19).

- **`RunPanel.tsx`** states the `uploading` gate's rationale twice, near-verbatim, fifteen lines apart — once above `const uploading` and again inside the `blocked` comment. In a file that is roughly half comment, one copy gets corrected and the other keeps asserting the superseded reason.
- **`scripts/generate-fixtures.mjs`** carries the same `execFileSync` failure block three times (`runBundle`, `writeInputsTemplate`, `dumpContracts`), each wrapping an options object that repeats `cwd`, the `PIPELEX_NO_DECK_NOTICE` env and `stdio`. This PR took it from two copies to three, and they have **already drifted**: `maxBuffer` differs across all three and only one sets `encoding`. One helper owning the shared parts would mean a fourth pipelex invocation cannot forget the deck-notice suppression or the error echo.
- **The up-front interpreter guard's comment** claims to mirror "the `writePipeIoContracts` call site" — but `writeContractsFixture` reaches `dumpContracts` too, under a different condition (`!FROM_DISK && !PARTIAL`). No reachable gap exists today, because `!PARTIAL && !FROM_DISK` implies the full pipeline set. That is an unstated invariant holding up a guard, and the hygiene note's own suggestion (let `--only` name a corpus entry) is exactly the edit that would break it.
- **`RunPanel.stories.tsx`** repeats the hanging-upload harness across the upload stories — the same `pending` ref and deferred `uploadFile`, several `data-testid="settle-upload"` buttons, and an identical "the abandoned upload did not land" epilogue in four play functions. A `useHangingUpload()` helper and an `expectUploadAbandoned()` assertion would leave each story showing only what makes it distinct, which is also what makes them readable as a set.

## 7. The Tailwind preflight remedy

`.storybook/preview.ts` imports the kernel's `styles.css`, which carries full Tailwind preflight and therefore applies to every graph story, though no consumer of `@pipelex/mthds-ui/graph/react` ever loads it. Measured directly: one rule does essentially all of it (`line-height: 1.5` on the root), card text moves from `line-height: normal` to a fixed value, and `.react-flow__node` heights do not change at all because ELK sizes them.

The claim in `design.md` and `CHANGELOG.md` has been corrected to say that. The **remedy** is deferred: neutralising the root line-height for the graph stories is one line, but `CLAUDE.md`'s Workflow Rule 2 makes Storybook the mandatory verification surface for exactly this kind of change, and the kernel's own controls set explicit line-heights, so the blast radius needs a visual pass rather than a test run. It is a change to make deliberately with Storybook open, not as a review-round fix.

## Related, already recorded elsewhere

- The panel cannot fix a plural file input's row identity — the kernel keys rows by index. Filed as `../../../wip/inbox/2026-08-23-mthds-form-list-row-upload-identity.md`.
- `getPipeIOContract` returning an inherited `Object.prototype` member for an unknown pipe code is the same root cause as the already-filed prototype-key brief, and has been appended to it.
- The Run button's contrast is below WCAG AA in both palettes: `deferred-run-button-contrast.md`, awaiting a palette decision.
- The fold's `showOptional` persisting across a contract change stays deliberate: `deferred-optional-fold-scope.md`. The revealed-optionals latch added in the final sweep resets on a contract change, which is about _which optionals are on screen_ and does not touch that decision.
