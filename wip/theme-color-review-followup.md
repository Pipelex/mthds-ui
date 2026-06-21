# Color-theming review follow-up

Follow-up items from the xhigh code review of the `fix/Color-themes` branch (the tri-state theme feature: widened `GraphViewer` theme, new `useSystemTheme` hook, reworked standalone adapter). The branch built the third state as `auto`; **the decision is to standardize it to `system`** — see item 0. This doc captures the findings we decided to act on, with enough context to pick up cold. It is the engineering counterpart to the design doc in [`theme-auto-mode-design.md`](./theme-auto-mode-design.md).

Each item lists: **what's wrong**, **why it matters**, **the fix**, **how to verify**, and any **cross-item dependency**. Do item 0 first — it changes the vocabulary several other items touch.

---

## ✅ COMPLETE — all items done & verified (2026-06-21)

_All actionable items (0, 1, 2, 3-substitute, 4, 5, 6, 7) are done. `make check` green (lint + format + typecheck). `make test` green (1256 tests, incl. 10 `useSystemTheme` seam tests + all Storybook play functions). Storybook visual verification done via `/browse`; standalone built and the JS-disabled `data-theme="system"` FOUC fix confirmed. Only the two optional "Consider" items remain (intentionally deferred). **The per-item table below is the mid-execution snapshot, kept as a record — see "FINAL STATUS" + "Verification evidence" immediately below it for the authoritative end state.**_

### FINAL STATUS (authoritative)

- **0** rename `auto` → `system` — ✅ done & verified (grep clean; built CSS has `body[data-theme="system"]`, 0× `auto`; toggle reads "system", cycles `system → light → dark`).
- **4** `parseTheme` fail-loud — ✅ done & verified (tests green).
- **1** `addEventListener` guard — ✅ done; `subscribeToSystemTheme` exported; seam tests cover modern + legacy + SSR-no-op.
- **6** skip subscription when injected — ✅ done; refactored to pure `systemThemeStore(injected)` (memoized in the hook via `useMemo` so `subscribe` stays stable); test asserts 0 `matchMedia` calls when injected.
- **5** live `change`-reactivity test — ✅ done (A1): seam tests fire `change` on modern + legacy mocks, assert re-resolution + cleanup.
- **2** SSR snapshot — ✅ done (option b): kept server snapshot = DARK, added a real `## SSR` section to `docs/theming.md`; the `useSystemTheme.ts` docstring anchor now resolves.
- **3** controlled-prop contract — ❌ cancelled (no code); substitute done: `## The theme prop is a reactive default` section in `docs/theming.md`.
- **7** `resolveMode` dedupe — ✅ done & verified; deleted in `adapter.ts`, mount paint calls `resolveActiveTheme(viewerProps.theme, detectSystemTheme())`, unused `GRAPH_THEME_MODE` import dropped (`grep resolveMode src/` empty).

### Dangling references — RESOLVED

1. `useSystemTheme.ts` docstring → `docs/theming.md` → **"SSR"** — section created. ✅
2. `CHANGELOG.md` line 14 → `docs/theming.md` → **"Migrating from the old `onThemeChange`"** — section created. ✅

### Verification evidence (2026-06-21)

- **`make check`** green; **`make test`** green (1256 passing); `useSystemTheme.test.ts` = 10 passing.
- **Storybook `CycleThroughModes`** (`/browse`): label `Theme: system — switch to light` → `light — switch to dark` → `dark — switch to system` → back to `system`; container `--mode-*` / `--theme-*` classes track; palette + toggle icon (sun/moon) visibly switch. Never reads "auto".
- **Storybook `SystemModeFollowsInjectedTheme`**: flipping injected `systemTheme` inverts the resolved theme (`--theme-dark` ↔ `--theme-light`) while `--mode-system` stays constant, no toolbar click.
- **Standalone, JS disabled, `<body data-theme="system">`**: body bg `rgb(255,255,255)`, toolbar chrome `rgb(246,248,250)` + border — themed, not unstyled. FOUC fix holds in degrade-without-JS.

### Remaining work

None blocking. Optional only: the two "Consider" items below. Branch is `fix/Color-themes` — ready to land; open a PR via the usual flow when desired (do not merge without explicit confirmation).

### Status by item

| Item                                                  | Status                                       | Notes                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| ----------------------------------------------------- | -------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **0** — rename `auto` → `system`                      | ✅ **DONE**                                  | Full sweep: code, CSS, HTML, tests, stories, docs, changelog. Verified `grep -rn 'GRAPH_THEME_MODE.AUTO\|data-theme="auto"\|mode-auto' src/` is empty. Story export renamed `AutoFollowsInjectedSystemTheme` → `SystemModeFollowsInjectedTheme`. `FOLD_MODE.AUTO` left untouched (correct).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| **4** — `parseTheme` fail-loud                        | ✅ **DONE (code + tests)**                   | `viewerProps.ts` now: absent/null → `system`; present-but-invalid → `throw` (matches `parseFoldMode`/`parseDirection`). Added a `describe("theme")` block in `viewerProps.test.ts` (defaults, verbatim pass-through, accepts legacy `system`, throws on `drak`/`midnight`). Landed together with item 0 as planned.                                                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| **1** — `matchMedia.addEventListener` guard           | 🟡 **CODE DONE, TEST PENDING**               | `subscribeToSystemTheme` in `useSystemTheme.ts` now prefers `addEventListener`, falls back to legacy `addListener`/`removeListener`. **Test still owed** (see item-5 blocker below — same file, shared infra question).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| **6** — skip subscription when `injected` set         | 🟡 **CODE DONE (useCallback), TEST PENDING** | DONE in code: `useSystemTheme` skips the live subscription + per-render detect when `injected` is set, via `React.useCallback`-branched `subscribe`/`getSnapshot`; hook still always calls `useSyncExternalStore` (rules-of-hooks). PLANNED for next session: extract the branch into a pure exported `systemThemeStore(injected)` helper (returns `{subscribe, getSnapshot}`) so the injected-skip path is unit-testable as a pure seam under A1 — the current `useCallback` shape can't be tested without a renderer. _(refactor NOT yet done.)_                                                                                                                                                                                                                                      |
| **5** — live `change`-reactivity test                 | 🟡 **DECIDED: A1 — code/test NOT started**   | **Decision A1 locked** (user, 2026-06-21): export `subscribeToSystemTheme` + test it as a pure seam in the node env, no new deps. Covers: modern `addEventListener` path fires `onChange` (item 5 reactivity); legacy `addListener`-only path doesn't throw and still fires (item 1); cleanup unsubscribes; `systemThemeStore(injected)` registers no listener + returns injected (item 6).                                                                                                                                                                                                                                                                                                                                                                                             |
| **2** — SSR snapshot hardcodes DARK                   | 🟡 **DECISION MADE, DOCS OWED**              | Chose **option (b): accept the documented limitation** (keep `getServerSnapshot` = DARK; a graph viewer is inherently client-side / usually `ssr:false`, and a third "unresolved" resolved-theme state would ripple through `getPaletteForTheme` + container class for little gain). **Action remaining:** write a real **"SSR"** section in `docs/theming.md` — the `useSystemTheme.ts` docstring (line ~70) and the existing `docs/theming.md` "SSR / no matchMedia" bullet already point at it, so the anchor must become a proper section. ⚠️ _If you disagree with option (b), this is a reversible call — see item 2 body._                                                                                                                                                       |
| **3** — controlled `theme` prop not authoritative     | ❌ **CANCELLED (decided 2026-06-21)**        | **No code change.** Cancelled deliberately: (1) the current hybrid works fine for the only shipping consumer (the standalone) precisely because the toggle overrides locally and the constant prop never reverts it; (2) there is already a clean escape hatch for the "host fully owns theme" case — `showThemeToggle={false}`; (3) the strict-controlled fix would touch the visible standalone toggle path + need an adapter echo-back, high risk for small payoff. **Substitute (low-risk, still owed):** document the _existing_ contract in `docs/theming.md` — the `theme` prop is a **reactive default/seed**; pair it with `showThemeToggle={false}` to fully control theme from outside. The desync the review flagged is then a documented, intentional contract, not a bug. |
| **7** — `resolveMode` duplicates `resolveActiveTheme` | 🔴 **NOT STARTED**                           | Mechanical. Delete `resolveMode` in `adapter.ts` (currently still present, renamed to `.SYSTEM` during item 0) and call `resolveActiveTheme(viewerProps.theme, detectSystemTheme())` at the mount paint site (`adapter.ts` ~line 111). ⚠️ After deletion the `GRAPH_THEME_MODE` import in `adapter.ts` becomes **unused** — drop it (and ensure `resolveActiveTheme` is imported from `@graph/react/viewer/GraphViewer`).                                                                                                                                                                                                                                                                                                                                                               |
| **Consider** (optional)                               | ⬜ not addressed                             | The two "Consider" items (placeholder `viewerProps` on config-load throw; standalone `system` two-sources-of-truth) remain untouched — judgment calls, non-blocking.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |

### Dangling references I introduced that MUST be resolved before "done"

These point at doc sections that **do not exist yet** — leaving them is a broken reference:

1. `src/graph/react/viewer/useSystemTheme.ts` docstring → `docs/theming.md` → **"SSR"** (create it, item 2).
2. `CHANGELOG.md` line 14 → `docs/theming.md` → **"Migrating from the old `onThemeChange`"** (create it). NOTE: this is tied to the **accepted breaking change** (onThemeChange signature widening, review #7), **independent of the now-cancelled item 3** — it still needs writing.

### Decisions (resolved 2026-06-21)

- **Decision A (item 5 test infra) → A1.** Export `subscribeToSystemTheme` + test as a pure seam in node, no new deps. Plus extract `systemThemeStore(injected)` so item 6's injected-skip is also pure-seam-testable.
- **Decision B (item 3 contract) → CANCELLED.** Do not re-architect into controlled/uncontrolled; keep the hybrid and document the existing contract (`theme` is a reactive default; `showThemeToggle={false}` to fully control). See item 3 row.

### Remaining work (post-decisions) — ✅ ALL DONE (superseded by FINAL STATUS at top)

1. ~~Run `make test` to confirm items 0 + 4 green~~ — done (1256 green; `snapshots.test.ts` did not need re-baselining).
2. ~~**Item 5/1/6 (A1):** refactor `useSystemTheme.ts`, write seam tests~~ — done (`subscribeToSystemTheme` + `systemThemeStore` exported; 10 tests).
3. ~~**Item 7:** delete `resolveMode`, call `resolveActiveTheme(...)`, drop unused import~~ — done.
4. ~~**Docs owed:** `docs/theming.md` — SSR section, onThemeChange migration, reactive-default note~~ — done (all three sections added).
5. ~~`make check && make test`, then Storybook visual verification + standalone FOUC check~~ — done (see Verification evidence at top).

---

## 0. Standardize the third state on `system`, not `auto` — value AND UI label ⚠️ do first

**Decided.** The third theme state is `system` everywhere — the wire/enum value, the CSS selector value, and the user-facing toggle label. The word "auto" is dropped entirely; there is no "Auto" button text, no `"auto"` token. This is the headline correctness fix (review finding #1); do it before the rest because it changes vocabulary the other items touch. (`FOLD_MODE.AUTO` is a separate, unrelated concept — leave it alone.)

### The break it fixes

The branch renamed the third theme state from `system` → `auto`, but **only inside mthds-ui**. The producer side still speaks `system`:

- `pipelex/pipelex/graph/reactflow/reactflow_config.py:8` — `ReactFlowTheme` enum is `DARK = "dark"`, `LIGHT = "light"`, `SYSTEM = "system"`. No `auto`.
- `pipelex/pipelex/graph/reactflow/templates/reactflow.html.jinja2:16` — emits `<body data-theme="{{ theme }}">` and injects the same value into the `pipelex-config` JSON blob.

So when a pipelex user selects `system`, the generated standalone HTML contains `<body data-theme="system">` and `config.theme = "system"`. In the renamed mthds-ui:

- `src/standalone/viewerProps.ts:46` `parseTheme("system")` no longer matches any branch and **silently coerces to `auto`** (see item 4).
- `src/standalone/standalone.css` only styles `[data-theme="dark"]`, `[data-theme="light"]`, `[data-theme="auto"]`, and `body:not([data-theme])`. `body[data-theme="system"]` matches **none** → no `--chrome-*` tokens, no `background`/`color` on `<body>` → page chrome (toolbar, header) renders unstyled.

**Failure:** a flash of unstyled chrome on every load until the deferred `setTimeout(0)` in `adapter.ts:101` rewrites `data-theme` to `auto`; **permanently broken** (unstyled) if the JS bundle fails to load — and the standalone HTML is explicitly designed to degrade (it CDN-loads everything with SRI). Reverting to `system` makes the static `<body data-theme="system">` match a real CSS rule, killing the FOUC even before JS runs.

### Why `system` — and why not even "Auto" as a label

`system` was the established value on **both** sides _before_ this branch — the now-deleted `src/standalone/pageTheme.ts` cycled `dark → light → system` (confirm: `git show HEAD:src/standalone/pageTheme.ts`), and pipelex `ReactFlowTheme.SYSTEM` still ships it. The branch renamed it unilaterally. Reverting wins on three counts:

1. **Zero cross-repo coordination** — matches what pipelex emits and what every already-generated standalone HTML in the wild contains (static, CDN-loaded, not retro-fixable).
2. **React-ecosystem convention** — `next-themes` / shadcn / Android "System default" all use `system` as the value; a React dev integrating mthds-ui expects it.
3. **Semantic precision** — the feature resolves against `prefers-color-scheme`; it literally follows the _system_. `auto` is vaguer (could read as time-of-day or location).

We also drop "Auto" as a UI label (the toggle reads "system", not "Auto") so the value and the label are the same word — no translation layer to drift, no second vocabulary.

**Rejected alternative — going `auto` end-to-end:** would require a coordinated breaking change in pipelex (`ReactFlowTheme.SYSTEM → AUTO`) _and_ would orphan every previously-generated standalone HTML forever (they keep `data-theme="system"` and render broken). Not worth a cosmetic naming change. Not pursued.

### Execution map (exact sites)

Rename the constant key + value `GRAPH_THEME_MODE.AUTO = "auto"` → `GRAPH_THEME_MODE.SYSTEM = "system"`, then sweep every reference. **Leave `FOLD_MODE.AUTO` (`types.ts:429`) and CSS `pointer-events: auto` untouched — unrelated.** (Line numbers are from the branch state at review time; re-grep before editing.)

**Code — value/identifier:**

- `src/graph/types.ts:456` — `AUTO: "auto"` → `SYSTEM: "system"` in `GRAPH_THEME_MODE` (NOT `FOLD_MODE` at `:429`). Update the doc comments at `:436`, `:448`, `:466`.
- `src/graph/graphConfig.ts:198` — `theme: GRAPH_THEME_MODE.AUTO` → `.SYSTEM` (comment at `:195`).
- `src/graph/react/viewer/GraphViewer.tsx:215, :224` — `GRAPH_THEME_MODE.AUTO` → `.SYSTEM` (`resolveExternalThemeMode` default + `resolveActiveTheme`); comments at `:78, :80, :83, :86, :92–93, :206, :220, :323`. Leave the foldMode comments at `:70, :188`.
- `src/standalone/adapter.ts:71` — `GRAPH_THEME_MODE.AUTO` → `.SYSTEM` (`resolveMode`); comments at `:8, :57, :61`.
- `src/standalone/viewerProps.ts:50, :54` — `GRAPH_THEME_MODE.AUTO` → `.SYSTEM` (this is where the silent-coerce lives — coordinate with item 4); comment at `:41–44`.
- `src/graph/react/index.ts:12` and `src/graph/react/viewer/useSystemTheme.ts:27` — `auto` in comments → `system`.

**UI label — drop the "auto" word:**

- `src/graph/react/viewer/GraphToolbar.tsx:240` — `GRAPH_THEME_MODE.AUTO` in `THEME_MODE_CYCLE` → `.SYSTEM`.
- `:261` — `[GRAPH_THEME_MODE.AUTO]: "auto (follows system)"` → `[GRAPH_THEME_MODE.SYSTEM]: "system"`.
- `:266` — the `next === AUTO ? "auto" : next` ternary is redundant once the value is `"system"`; simplify to `names[next]`.
- Comments at `:217` ("`auto` mode — a monitor glyph"), `:237`, `:245`. The monitor icon and its meaning stay; only the word changes.

**CSS / HTML — selector value:**

- `src/standalone/standalone.css` — `body[data-theme="auto"]` → `body[data-theme="system"]` at `:43, :55, :210, :213, :219` (5 occurrences; `replace_all` on `data-theme="auto"`).
- `src/standalone/graph-standalone.html:21` — comment "tri-state dark/light/auto" → "system". The actual `data-theme` is producer-substituted (`<!--PIPELEX_THEME-->`), so no value change needed there.

**Tests:**

- `src/graph/__tests__/graphConfig.test.ts:29–30` — test name + `.AUTO` → `.SYSTEM`.
- `src/graph/react/viewer/__tests__/themeToggle.test.ts:11–14, :18, :26, :37–38, :41` — `.AUTO` → `.SYSTEM`, and the expected label strings: `"Theme: auto (follows system) — switch to light"` → `"Theme: system — switch to light"`, and `"switch to auto"` → `"switch to system"`. Comment at `:7`.
- `src/graph/react/viewer/__tests__/themeResolution.test.ts:27–28, :37, :41, :61, :93–94` — `.AUTO` → `.SYSTEM`; comments at `:8, :40`.

**Stories:**

- `src/graph/react/viewer/__stories__/ThemeToggle.stories.tsx` — `theme="auto"` → `theme="system"` (`:99`); container-class assertions `react-flow-container--mode-auto` → `--mode-system` (`:54, :80`). The class is built from the mode value at `GraphViewer.tsx:943`, so the value rename flows through automatically — only the assertion strings need updating. Rename the `AutoFollowsInjectedSystemTheme` export → e.g. `SystemModeFollowsInjectedTheme`; update comments at `:53, :58, :77, :85`.

**Docs / changelog:**

- `docs/theming.md` — all `auto` → `system` (`:7, :8, :11–13, :20, :22` heading, `:30–32, :44`), including the ASCII flow diagram and the toggle-cycle line.
- `CHANGELOG.md` Unreleased — rewrite the `auto` entries: heading "`auto` theme mode", cycle `auto → light → dark → auto`, "the default theme is now `auto`", and `dark | light | auto` → `system`.

(Historical scratch `wip/theme-auto-mode-design.md` may keep its `auto` references — it records the branch as built and isn't load-bearing.)

**Verify:** `grep -rn 'GRAPH_THEME_MODE.AUTO\|data-theme="auto"\|mode-auto' src/` returns nothing, and `grep -rni auto src/ | grep -i theme` shows only `FOLD_MODE`/`foldMode` hits; then `make check && make test`; then **visually** in Storybook (CLAUDE.md rule 2) confirm the toggle reads "system" and cycles `system → light → dark`; finally build the standalone and confirm `<body data-theme="system">` themes with JS disabled (no FOUC).

---

## Must-fix (in-repo)

### 1. `matchMedia.addEventListener` has no feature guard (review #3)

- **File:** `src/graph/react/viewer/useSystemTheme.ts:41` (`subscribeToSystemTheme`).
- **What's wrong:** calls `mql.addEventListener("change", onChange)` unconditionally. The deleted standalone code guarded this with a `typeof mq.addEventListener === "function"` check before subscribing and fell back to the legacy `addListener`.
- **Why it matters:** on a host whose `MediaQueryList` only supports the legacy `addListener` API (older Safari/WebKit, some VS Code webview / Electron builds) the `subscribe` callback handed to `useSyncExternalStore` throws `TypeError: mql.addEventListener is not a function` during render → React surfaces an uncaught error and the **entire GraphViewer fails to mount (blank graph)**. This hits exactly the webview host class the `systemTheme` prop was added to support.
- **Fix:** guard the subscribe and unsubscribe; fall back to `addListener`/`removeListener` when `addEventListener` is absent. Mirror the deleted `pageTheme.ts` guard.
- **Verify:** unit test in `useSystemTheme.test.ts` with a mock `MediaQueryList` exposing only `addListener` — assert no throw and that the change handler still fires. `make test`.

### 2. SSR server snapshot hardcodes DARK → hydration flash (review #2)

- **File:** `src/graph/react/viewer/useSystemTheme.ts:58` (the `getServerSnapshot` arg `() => GRAPH_THEME.DARK`), also `detectSystemTheme` default at `:31`.
- **What's wrong:** the `useSyncExternalStore` server snapshot is hardcoded `GRAPH_THEME.DARK`, while the client snapshot reads `matchMedia`. An SSR host (e.g. `hub`, Next.js) rendering `GraphViewer` with `theme=system` on a light-mode client paints dark server-side, then flips to light on hydration.
- **Why it matters:** visible dark→light flash **plus** a React hydration-mismatch warning on the container className (`react-flow-container--theme-dark` vs `--theme-light`).
- **Fix options (pick one, document the choice):**
  - Treat `system` as not-yet-resolved on the server: render a neutral/unresolved container until mount (avoids committing to a wrong theme), or
  - Accept the documented limitation and tell SSR consumers to pin `theme` or pass `systemTheme`. At minimum add a `docs/theming.md` "SSR" note. (A library can't read client `prefers-color-scheme` on the server — there is no fully-correct auto-on-SSR answer, so the honest fix is to not paint a guess that mismatches.)
- **Verify:** render under `react-dom/server` `renderToString` with no `matchMedia` and confirm the chosen behavior; check for hydration warnings in a light-mode browser via a Storybook/SSR harness.
- **Dependency:** value name from item 0 (`system`).

### 3. Controlled `theme` prop isn't authoritative after a toolbar click (review #4)

- **File:** `src/graph/react/viewer/GraphViewer.tsx:316-321` (the external-sync effect) with `mode` state at `:314`.
- **What's wrong:** the effect only calls `setMode(externalMode)` when `externalMode !== prevExternalModeRef.current`. If a host holds `theme="light"` constant and the user clicks the in-graph toggle to `dark`, `externalMode` stays `"light"` and the ref stays `"light"`, so the effect never reverts — the toolbar override sticks, and re-rendering with the **same** prop value does not re-sync.
- **Why it matters:** an embedder (hub, webapp) that renders `<GraphViewer theme={userPref} />` and persists `userPref` itself, treating the prop as source of truth, silently desyncs: the displayed theme diverges from the prop and the persisted preference, with no way to force it back short of changing the prop value.
- **Fix — decide the contract and make it consistent, then document it:**
  - **Controlled:** if `theme` is provided, the toggle should call `onThemeChange` only (no internal `setMode`) and let the host echo the new value back through the prop. The internal `mode` state is then for the uncontrolled case only.
  - **Uncontrolled:** `theme` seeds initial state; the toggle owns it thereafter.
  - The current code is a hybrid that does neither cleanly. The cheapest correct version: when `themeProp` is set, derive `mode` from it each render (controlled) instead of holding divergent state.
- **Verify:** a test that renders with a constant `theme`, fires a toggle click, and asserts the rendered theme either follows the prop (controlled) or that `onThemeChange` fired with the new mode while the prop still governs. Document the chosen model in `docs/theming.md` (the current docs only imply it via "hide it with `showThemeToggle={false}` when the host fully controls the theme").
- **Dependency:** touches the same value vocabulary as item 0.

### 4. `parseTheme` silently coerces instead of failing loud (review #5)

- **File:** `src/standalone/viewerProps.ts:46-55`.
- **What's wrong:** `parseTheme` returns `GRAPH_THEME_MODE.AUTO` for any unrecognized/absent value and **never throws** — directly contradicting its two siblings in the same file: `parseFoldMode` (`:29`) and `parseDirection` (`:63`) both **throw** on a _present-but-invalid_ value, each with a comment ("throw rather than silently coercing, so the host page sees the failure"). `parseTheme` breaks the pattern with no justifying comment.
- **Why it matters:** a malformed producer value (`{theme:"drak"}` typo, `{theme:"midnight"}`, or a stale token) is swallowed and rendered as the default — masking the producer bug, the exact anti-pattern the sibling parsers were written to prevent. It is also what hides the item-0 break (`"system"` coerced instead of flagged).
- **Fix:** match the siblings — absent/null → default (`system` after item 0); present-but-unrecognized → `throw` with a message naming the valid set. Once item 0 lands, the valid set is `"dark" | "light" | "system"`, so the legacy `system` is accepted rather than coerced.
- **Verify:** update `src/standalone/__tests__/viewerProps.test.ts` (the review flagged line 7) to assert a bad value throws and `system`/absent are handled; `make test`.
- **Dependency:** **must land with item 0** — the accepted set depends on the chosen name.

### 5. Re-add live `change`-reactivity test coverage (review #8)

- **Files:** deleted `src/standalone/__tests__/pageTheme.test.ts`; new coverage belongs in `src/graph/react/viewer/__tests__/useSystemTheme.test.ts`.
- **What's wrong:** the deleted test was the only one pinning the tri-state cycle and the system-preference resolution that the old standalone `matchMedia` `change` handler relied on. That live reactivity moved into `useSystemTheme`, but **no replacement test fires an actual media-query `change` event** — the new story only exercises the _injected_ `systemTheme` path, despite a unit-test comment claiming the play function covers "matchMedia subscription + live `change` reactivity."
- **Why it matters:** a future regression in `subscribeToSystemTheme` (wrong event name, missing `addEventListener`, broken `useSyncExternalStore` wiring) would be uncaught — in `system` mode the graph would stop re-resolving when the OS dark/light setting changes, silently stuck on its initial theme until reload.
- **Fix:** add a test that renders a component using `useSystemTheme()` (no injected value), mocks `matchMedia` with a controllable `change` dispatch, flips `matches`, dispatches `change`, and asserts the resolved theme updates. Pairs naturally with the item-1 legacy-`addListener` test.
- **Verify:** `make test`; the test should fail if you comment out the `addEventListener` line in `subscribeToSystemTheme`.

---

## Should-fix cleanups (in-repo, lower risk)

### 6. `useSystemTheme` does wasted work when `injected` is set (review #11, CONFIRMED)

- **File:** `src/graph/react/viewer/useSystemTheme.ts:54-61`.
- **What's wrong:** the hook always calls `useSyncExternalStore(subscribeToSystemTheme, detectSystemTheme, ...)` and then returns `injected ?? detected` — so on the authoritative-host path (a caller passing `systemTheme`) it still registers a live `matchMedia("change")` listener and runs `detectSystemTheme()` every render, only to discard the result.
- **Why it matters:** an OS listener the host never wanted is kept alive for the component lifetime, plus per-render matchMedia work. Minor, but it's pure waste on exactly the host class (webviews) where `prefers-color-scheme` is unreliable.
- **Fix (respect rules-of-hooks — do not call the hook conditionally):** keep the `useSyncExternalStore` call, but when `injected !== undefined` make `subscribe` a no-op and `getSnapshot` return `injected`, so no real listener is registered. E.g. branch the `subscribe`/`getSnapshot` closures on `injected` before passing them in.
- **Verify:** test that with an injected value, no `addEventListener` is called on the mock MQL.

### 7. `resolveMode` duplicates `resolveActiveTheme` (review #10)

- **File:** `src/standalone/adapter.ts:70-72` vs the exported `resolveActiveTheme` used in `GraphViewer.tsx:327`.
- **What's wrong:** both collapse `mode === AUTO ? systemTheme : mode`. Two copies in different files; if the resolution rule ever changes, one gets updated and the standalone body chrome silently disagrees with the in-graph palette — the page/chart desync the adapter comment (`adapter.ts:60-62`) says this code exists to prevent.
- **Fix:** delete `resolveMode`; call `resolveActiveTheme(viewerProps.theme, detectSystemTheme())` at the mount paint site (`adapter.ts:111`).
- **Verify:** `make check && make test`; build standalone and confirm mount-time chrome matches the graph in all three states.

---

## Consider (optional — judgment call, not blocking)

- **Placeholder `viewerProps` sticks if config-load throws** (review #9, `adapter.ts:24` + `:107`). The first paint uses `buildViewerProps({}, null)`; if `validateGraphSpec` throws inside the deferred `setTimeout`, the reassignment never runs, so later `onThemeChange` reads the empty placeholder's `paletteColors` (undefined) and drops the host's custom palette for the session. Low likelihood (requires a malformed spec) but a clean fix is to assign `viewerProps` config-fields before the `validateGraphSpec` call, or wrap so a throw still leaves palette wired. Worth a comment at minimum.
- **Standalone `system` resolves via two sources of truth** (review #12/#13, `standalone.css:42` + `adapter.ts:111`): JS (`detectSystemTheme` → body palette) and CSS `@media (prefers-color-scheme)` (→ `--chrome-*`), each with duplicated dark/light hex blocks (four copies → drift risk). Items 0 and 7 reduce the surface; a deeper cleanup would drive chrome tokens from the same palette source. Defer unless touching this CSS anyway.

---

## Accepted breaking changes (no code action — awareness only, do not re-flag)

These are intentional and documented in `CHANGELOG.md` Unreleased. Listed so a cold reader doesn't re-open them:

- **Default theme flip `dark` → `system`** (review #6). Consumers that never set `theme` now follow the OS scheme. Documented BREAKING. (Value name per item 0.)
- **`onThemeChange` signature `(theme)` → `(mode, resolvedTheme)`** (review #7). External handlers wired to the old single arg now receive `mode` in arg 1, which can be the string `"system"`. Documented BREAKING — but worth an explicit one-line **migration note** in `docs/theming.md` for the VS Code extension / hub, since the first-arg value domain widened.

---

## Suggested order

1. **Item 0** (name → `system`) — sets vocabulary the rest depends on.
2. **Item 4** (`parseTheme` fail-loud) — lands with item 0; together they close the cross-repo break cleanly.
3. **Items 1, 5** (addEventListener guard + its test) — cheap, protect the webview host.
4. **Items 2, 3** (SSR snapshot, controlled-prop contract) — need a small design decision each; document the chosen behavior.
5. **Items 6, 7** (cleanups) — mechanical.

After all changes: `make check && make test`, then **visually verify Storybook** (per CLAUDE.md workflow rule 2 — graph/theme rendering changes must be confirmed in Storybook, not tests alone) and build + load the standalone HTML to confirm no FOUC with `data-theme="system"`.
