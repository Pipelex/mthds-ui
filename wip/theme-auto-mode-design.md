# Handoff brief — "auto" theme mode in `GraphViewer`

## Goal

Add a **third state to the GraphViewer theme toggle: `auto`**, resolved from the host environment. In a browser/standalone page `auto` follows the OS/browser via `prefers-color-scheme`; in a VS Code webview it follows the active VS Code color theme. Today the in-graph toggle is binary (dark ⇄ light) and the library only understands a binary `GraphTheme`.

This is a library change in `@pipelex/mthds-ui`. Consumers (the standalone wrapper, the VS Code extension `vscode-pipelex`, and `pipelex-app`) pick it up via a version bump. See **Consumer impact** below.

## Why now / what already exists

- The **standalone wrapper already reimplements tri-state** at the *page* level: `src/standalone/pageTheme.ts` cycles `dark → light → system` and resolves `system` via `prefers-color-scheme` (with a live `matchMedia` change listener in `src/standalone/adapter.ts`). But it drives a **separate** page button (`#theme-toggle` in `graph-standalone.html`), not the in-graph toolbar. The in-graph toolbar (`GraphToolbar`) stays binary.
- The **VS Code extension** (just shipped on `fix/Color-themes`) resolves the theme host-side from `vscode.window.activeColorTheme.kind` and sends a binary `config.theme`; its `pipelex.graph.theme` setting has an `auto` value that is resolved to `dark`/`light` *on the host*, never reaching the renderer as `auto`.

So `auto` logic exists but is **duplicated per host and never lives in the toolbar**. The fix is to make the library own the tri-state — the standalone's page-level `system` machinery then collapses into the library, and the VS Code extension can hand the renderer a live `auto`.

Note: `auto` matches an existing convention in the codebase — `FOLD_MODE.AUTO = "auto"` (`src/graph/types.ts`). Prefer `auto` over `system` for the new mode value, and rename the standalone's `"system"` to `"auto"` as part of the dedupe.

## Current state (precise)

- `src/graph/types.ts` — `GRAPH_THEME = { DARK, LIGHT }`, `type GraphTheme = 'dark' | 'light'`, `GraphConfig.theme?: GraphTheme`.
- `src/graph/graphConfig.ts` — `getPaletteForTheme(theme: GraphTheme)` returns `LIGHT_PALETTE_COLORS` / `DARK_PALETTE_COLORS`; `DEFAULT_GRAPH_CONFIG.theme = GRAPH_THEME.DARK`.
- `src/graph/react/viewer/GraphViewer.tsx`:
  - `resolveExternalTheme(themeProp, configTheme): GraphTheme` (default `DARK`), with a documented reactivity contract (prop wins, clears fall back through config, config changes propagate).
  - Internal `theme` state (binary). Two effects: one re-syncs `theme` when `externalTheme` changes; one applies `getPaletteForTheme(theme)` (merged over `config.paletteColors`) as inline CSS vars on `containerRef`, and reports via `onThemeChange(theme)`.
  - Container: `className={`react-flow-container react-flow-container--theme-${theme}`}`.
  - Toolbar wiring: `theme={showThemeToggle ? theme : undefined}` and `onThemeChange={showThemeToggle ? setTheme : undefined}`.
- `src/graph/react/viewer/GraphToolbar.tsx` — binary toggle button; `SUN_ICON`/`MOON_ICON`; click flips `LIGHT ⇄ DARK`; renders only when both `theme` and `onThemeChange` are set.
- `src/graph/react/viewer/__tests__/themeResolution.test.ts` — locks the `resolveExternalTheme` reactivity contract.
- `src/standalone/{pageTheme.ts,adapter.ts,viewerProps.ts,graph-standalone.html}` — page-level tri-state + `parseTheme` (currently coerces anything non-`light` to `dark`).

## Proposed design

Keep two distinct concepts:

- **Mode** — the user's *selection*: `dark | light | auto`. This is what the toggle cycles and what gets persisted/reported.
- **Resolved theme** — the binary `dark | light` actually used to pick the palette + container class. `auto` resolves to the environment theme.

```
mode (dark|light|auto) ─┐
                        ├─► resolvedTheme (dark|light) ─► getPaletteForTheme() + container class
systemTheme (dark|light)┘    resolvedTheme = mode === 'auto' ? systemTheme : mode
```

### 1. Types (`src/graph/types.ts`)

- Add `GRAPH_THEME_MODE = { DARK: 'dark', LIGHT: 'light', AUTO: 'auto' } as const` and `type GraphThemeMode = ...`.
- Keep `GRAPH_THEME` / `GraphTheme` as the **resolved** binary type (palette input). The `dark`/`light` overlap between the two is intentional — a resolved theme is a valid mode.
- Widen `GraphConfig.theme?: GraphThemeMode` (was `GraphTheme`).

### 2. System detection hook (`src/graph/react/viewer/useSystemTheme.ts`, new)

A small hook returning the resolved environment theme, with an injection point so non-browser hosts stay authoritative:

- `useSystemTheme(injected?: GraphTheme): GraphTheme`
  - If `injected` is defined → return it (host owns detection; re-renders drive updates).
  - Else subscribe to `window.matchMedia('(prefers-color-scheme: dark)')`, return `dark`/`light`, and re-render on its `change` event.
  - SSR / no-`window` safe: default `dark` when `matchMedia` is unavailable.

Keeping the matchMedia logic in a hook (not inline) mirrors how `pageTheme.ts` already isolates it for testing.

### 3. `GraphViewer` (`src/graph/react/viewer/GraphViewer.tsx`)

- New prop `systemTheme?: GraphTheme` — host-injected environment theme (authoritative when set). Forwarded to `useSystemTheme`.
- Replace `resolveExternalTheme` with `resolveExternalThemeMode(themeProp, configTheme): GraphThemeMode` — same reactivity contract, just over the 3-value domain. Internal state becomes `mode` (a `GraphThemeMode`).
- Derive `const resolvedTheme = mode === GRAPH_THEME_MODE.AUTO ? systemResolved : mode;` where `systemResolved = useSystemTheme(systemTheme)`.
- Everything that consumed `theme` now consumes `resolvedTheme`: the palette effect (`getPaletteForTheme(resolvedTheme)`), and the container class. Optionally also emit `react-flow-container--mode-${mode}` for hosts that want to style chrome by selection.
- `onThemeChange` contract — **report both** the selected mode and the resolved theme (chrome-sync needs the resolved value; persistence needs the mode):
  - `onThemeChange?: (mode: GraphThemeMode, resolvedTheme: GraphTheme) => void`
  - Fire it on toggle clicks **and** when `auto` re-resolves because the environment changed (so page chrome stays in sync while in `auto`).
- Toolbar wiring passes `mode` + `onThemeModeChange={setMode}` (see below).

### 4. `GraphToolbar` (`src/graph/react/viewer/GraphToolbar.tsx`)

- Props become `themeMode?: GraphThemeMode` + `onThemeModeChange?: (mode: GraphThemeMode) => void`; render the button only when both are set.
- Click cycles three states. Proposed order **`dark → light → auto → dark`** (confirm — see Open decisions). Each state shows a distinct icon and a tooltip naming the current state and the next:
  - `dark` → `MOON_ICON`
  - `light` → `SUN_ICON`
  - `auto` → new `AUTO_ICON` (a half-filled circle / "contrast" glyph, or a monitor glyph). SVG with `stroke="currentColor"` like the others — no hardcoded hex (CLAUDE.md token rule).
- Keep `aria-label`/`title` accurate per state (currently a single `themeLabel`).

### 5. Defaults (`src/graph/graphConfig.ts`)

- **Decided:** `DEFAULT_GRAPH_CONFIG.theme = GRAPH_THEME_MODE.AUTO`. The graph follows the environment out of the box — the least-surprising default for an embedded component, and it removes the need for each host to special-case theming. This is a visible behavior change for any consumer that never set `theme` (it was effectively `dark` before): they now follow the OS/editor theme. Call it out prominently in the CHANGELOG as a behavior change. Hosts that want a fixed appearance must now pass `theme: 'dark'` (or `'light'`) explicitly.
- `getPaletteForTheme` is unchanged — it keeps taking a resolved binary `GraphTheme`.

### 6. Standalone dedupe (`src/standalone/*`)

The library now owns tri-state, so collapse the page-level reimplementation:

- Delete `pageTheme.ts` (or reduce it to nothing) and the `matchMedia` listener + `#theme-toggle` wiring in `adapter.ts`. Let the **in-graph toolbar** be the single toggle.
- The standalone keeps an `onThemeChange((mode, resolvedTheme) => …)` handler to (a) re-skin `document.body` via `applyBodyPalette(resolvedTheme, …)` so page chrome matches, and (b) optionally reflect `mode` onto `body[data-theme]` / the label if the page chrome still shows it.
- `viewerProps.parseTheme` must accept `'auto'` (and become the default). The standalone no longer resolves `system` itself — it passes `mode` straight through and lets `useSystemTheme` (matchMedia path) resolve it.
- If the standalone page still wants a visible page button, drive it from the same `mode` rather than a parallel state machine.

## Consumer impact — `vscode-pipelex`

The extension renders `GraphViewer` in a webview (`editors/vscode/src/pipelex/graph/webview/adapter.ts`) and builds `config` host-side (`methodGraphPanel.ts` + `graphConfig.ts`). After this lands:

- It can send `config.theme: 'auto'` and feed an authoritative `systemTheme`, instead of resolving dark/light on the host. Two ways to source `systemTheme` inside the webview:
  1. **Extension-driven:** map `vscode.window.activeColorTheme.kind` → `dark|light` and postMessage it; update on `vscode.window.onDidChangeActiveColorTheme`. Authoritative, but needs a round-trip.
  2. **Adapter-local:** the webview adapter reads VS Code's body class (`vscode-dark` / `vscode-light` / `vscode-high-contrast` / `vscode-high-contrast-light`) and watches it with a `MutationObserver`, deriving `systemTheme` with no extension round-trip. This keeps VS Code specifics in the vscode-pipelex adapter and the mthds-ui library generic.
- **Verify** whether `prefers-color-scheme` is reliable inside a VS Code webview. If it is, the library's matchMedia fallback covers VS Code with **no** `systemTheme` injection. If it is not (historically flaky), use option 2 above. Designing the library around an injectable `systemTheme` means we are correct either way.
- Existing invariant to preserve: the host must **never** send `config.paletteColors` as a full palette — `GraphViewer` merges it over the theme palette and would re-pin node/edge colors to one theme (this is exactly the light-mode bug fixed on `fix/Color-themes`). `auto` does not change this.
- The `pipelex.graph.theme` setting can gain a real `auto` that now flows through to the renderer rather than being flattened host-side.

`pipelex-app` (the webapp) embeds `GraphViewer` directly in a browser, so it gets `auto` for free via the matchMedia fallback.

## Acceptance criteria

- The toolbar toggle cycles `dark → light → auto` (or agreed order); each state shows a distinct icon + accurate tooltip/aria-label.
- In a browser, `auto` follows the OS/browser preference **and updates live** when the OS theme changes (matchMedia `change`), with no reload.
- With an injected `systemTheme`, `auto` follows that value and re-renders when it changes.
- The resolved theme drives the palette: node/edge colors (not just the background) switch with the theme — the `fix/Color-themes` regression must not reappear.
- `onThemeChange` fires with `(mode, resolvedTheme)` on toggle clicks and on environment changes while in `auto`.
- SSR / no-`window` path defaults to `dark` and does not throw.
- The standalone shows a single toggle (the in-graph one); page chrome stays in sync with the graph in all three states.

## Test plan

- Unit: `resolveExternalThemeMode` reactivity contract — adapt `themeResolution.test.ts` to the 3-value domain (prop wins; clear falls back through config; config changes propagate; controlled→uncontrolled→controlled round-trips).
- Unit: `useSystemTheme` — injected value wins; matchMedia path returns dark/light and reacts to `change`; SSR default. Inject `matchMedia` like `pageTheme.ts` does so it runs without a DOM.
- Unit: toolbar cycle order + icon/label per state (pure mapping).
- Storybook play function (their E2E convention, CLAUDE.md §"Storybook Play Functions"): click through all three states and assert the container class / a sampled node color changes; simulate a `prefers-color-scheme` change while in `auto`.
- Remove/replace the standalone `pageTheme` tests folded into the library.

## File-by-file change map

- `src/graph/types.ts` — add `GRAPH_THEME_MODE` + `GraphThemeMode`; widen `GraphConfig.theme`.
- `src/graph/react/viewer/useSystemTheme.ts` — new hook (matchMedia + injection, SSR-safe).
- `src/graph/react/viewer/GraphViewer.tsx` — `mode` state, `resolveExternalThemeMode`, `systemTheme` prop, `resolvedTheme` derivation, palette/class wiring, new `onThemeChange` signature, toolbar wiring.
- `src/graph/react/viewer/GraphToolbar.tsx` — tri-state button + `AUTO_ICON`; `themeMode`/`onThemeModeChange` props.
- `src/graph/graphConfig.ts` — `DEFAULT_GRAPH_CONFIG.theme` default decision (recommend `auto`).
- `src/standalone/{adapter.ts,pageTheme.ts,viewerProps.ts,graph-standalone.html}` — dedupe page-level tri-state; `parseTheme` accepts `auto`; `onThemeChange` body-palette sync.
- Tests + a Storybook story; CHANGELOG entry; CLAUDE.md note if a new token/icon convention is introduced.
- Bump the package version; coordinate the bump in `vscode-pipelex` (and `pipelex-app`).

## Settled decisions

- **Default mode is `auto`.** `DEFAULT_GRAPH_CONFIG.theme = GRAPH_THEME_MODE.AUTO` — see §5. Behavior change for consumers that never set `theme`; flag in the CHANGELOG.

## Open decisions (please confirm before implementing)

- **Cycle order:** `dark → light → auto` vs `light → dark → auto` vs `auto → light → dark`.
- **Prop shape:** widen the existing `theme`/`config.theme` to accept `auto` (recommended — one axis, fewer props) vs add a separate `themeMode` axis alongside the binary `theme`.
- **`onThemeChange` signature:** single `(mode, resolvedTheme)` callback (recommended) vs two callbacks (`onThemeChange(resolvedTheme)` + `onThemeModeChange(mode)`). This is a breaking change to the current `(theme) => void` either way — fine per the workspace's no-back-compat rule, but the standalone + any `onThemeChange` consumer must update in the same change.
- **`auto` icon:** contrast/half-circle glyph vs monitor glyph.

## Suggested phasing

1. Library core — types, `useSystemTheme`, `GraphViewer` mode/resolve/`systemTheme`, `GraphToolbar` tri-state + icon. Unit + story tests. **Checkpoint:** library renders all three states in Storybook, `auto` reacts to a simulated `prefers-color-scheme` change, and the resolveMode contract tests pass — a clean handoff point before touching hosts.
2. Standalone dedupe — collapse `pageTheme`/page button into the library toggle; wire `onThemeChange` body-palette sync; `parseTheme` accepts `auto`.
3. Publish (version bump) + consumer follow-ups — `vscode-pipelex` adapter feeds `systemTheme` (or relies on matchMedia if verified in webviews) and sends `theme: 'auto'`; `pipelex-app` picks it up.
