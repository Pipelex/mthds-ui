# Theming

`GraphViewer` renders in one of two **resolved themes** — `dark` or `light` — chosen by a **theme mode** the user selects. The two concepts are deliberately separate.

## Mode vs resolved theme

- **Mode** (`GraphThemeMode` = `dark | light | system`) is the user's _selection_. It is what the toolbar cycles, what gets persisted, and what `onThemeChange` reports first. Exposed via the `theme` prop / `config.theme`.
- **Resolved theme** (`GraphTheme` = `dark | light`) is the binary value actually used to pick the palette (`getPaletteForTheme`) and the container class. `system` resolves to the environment theme; `dark`/`light` resolve to themselves.

```
mode (dark|light|system) ─┐
                          ├─► resolvedTheme (dark|light) ─► getPaletteForTheme() + container class
systemTheme (dark|light) ─┘    resolvedTheme = mode === "system" ? systemTheme : mode
```

The `dark`/`light` overlap between the two types is intentional: a resolved theme is also a valid mode.

## Default

`DEFAULT_GRAPH_CONFIG.theme` is `system` — the graph follows the host environment out of the box. To pin a fixed appearance, pass `theme: "dark"` (or `"light"`) explicitly.

## The `theme` prop is a reactive default, not a strict controlled value

`GraphViewer` is **hybrid**, not strictly controlled. The `theme` prop (and `config.theme`) **seeds** the mode and **re-seeds** it whenever the prop value _changes_ — but the built-in toolbar can override the mode locally, and re-rendering with the _same_ `theme` value does not snap it back. So a host that holds `theme` constant while the user clicks the toggle will see the displayed theme diverge from the prop.

This is intentional: the toolbar works out of the box, and a host can still steer the theme by changing the prop. Pick the model that fits:

- **Let the graph own it (default).** Pass `theme` once as the initial appearance and let the toolbar drive it thereafter. Persist your own copy from `onThemeChange` if you want the choice to survive reloads.
- **Fully control it from outside.** Set `showThemeToggle={false}` and drive `theme` entirely from your own UI. With the toggle hidden there is no local override, so the prop is the single source of truth.

Mixing the two — holding `theme` constant _and_ leaving the toggle visible — is the one combination that desyncs; pick one model.

## How `system` resolves

- **Browser / standalone:** follows `prefers-color-scheme` **live** via `useSystemTheme`, re-resolving on the media query's `change` event (no reload).
- **Host-injected:** when the `systemTheme` prop is set, it is authoritative — the host owns detection and its re-renders drive updates. Use this where `prefers-color-scheme` is unreliable (e.g. a VS Code webview reading the editor's `vscode-dark` / `vscode-light` body class via a `MutationObserver`).
- **SSR / no `matchMedia`:** defaults to `dark` and never throws — see [SSR](#ssr) below for the hydration-flash caveat and how to avoid it.

`detectSystemTheme()` exposes the one-shot read for non-React callers (e.g. painting initial page chrome before any `onThemeChange` fires).

## SSR

A library can't read the client's `prefers-color-scheme` on the server — there is no correct server-side answer for `system`. `useSystemTheme` therefore returns `dark` from its `useSyncExternalStore` server snapshot, while the client snapshot reads `matchMedia` on hydration.

The consequence: an SSR host (e.g. a Next.js app) that renders `GraphViewer` with `theme="system"` for a **light**-mode client paints `dark` on the server, then flips to `light` on hydration — a brief dark→light flash plus a React hydration-mismatch warning on the container class (`react-flow-container--theme-dark` vs `--theme-light`).

This is an accepted, documented limitation, not a bug: painting a _guess_ that mismatches the client is worse than committing to one default, and a third "unresolved" theme state would ripple through `getPaletteForTheme` and the container class for little gain. A graph viewer is inherently client-side, so the cleanest options when you do SSR are:

- **Pin the theme:** pass `theme="dark"` or `theme="light"` so there is nothing to resolve on the client.
- **Inject the resolved theme:** pass `systemTheme` from a value you already know server-side (a persisted cookie, the host editor's theme class). When set it is authoritative — both the server and client snapshots return it — so there is no flip.
- **Render client-only:** mount the viewer behind `ssr: false` (or an equivalent client-only boundary) so the server never paints it.

## The toolbar toggle

The built-in toolbar cycles `system → light → dark → system`. Each mode shows a distinct icon — monitor (`system`) / sun (`light`) / moon (`dark`) — and an accessible label naming the current mode and the one a click switches to. Hide it with `showThemeToggle={false}` when the host fully controls the theme from outside.

## `onThemeChange`

`onThemeChange?: (mode, resolvedTheme) => void` fires on toggle clicks, on external prop/config updates, and when `system` re-resolves on an environment change. It reports **both** values: `resolvedTheme` keeps page chrome outside the container in sync, `mode` is what a host persists.

## Migrating from the old `onThemeChange`

`onThemeChange` changed signature in this release: `(theme) => void` → `(mode, resolvedTheme) => void`.

- **Before:** the single arg was the resolved `dark | light` theme.
- **After:** arg 1 is the selected **`mode`** (`dark | light | system` — it can now be the string `"system"`), arg 2 is the resolved **`dark | light`** theme.

If your handler persisted or applied the first arg as a binary theme, it will now sometimes receive `"system"`. Update it:

- **Persisting the user's selection?** Keep using arg 1 (`mode`) — `"system"` is exactly what you want to store so the choice round-trips on reload.
- **Applying a concrete light/dark appearance** (e.g. theming chrome outside the viewer)? Switch to arg 2 (`resolvedTheme`), which is always `dark | light`.

```ts
// before
onThemeChange={(theme) => setChromeTheme(theme)}

// after
onThemeChange={(mode, resolvedTheme) => {
  persistPreference(mode); // "dark" | "light" | "system"
  setChromeTheme(resolvedTheme); // "dark" | "light"
}}
```

## The palette is the contract — never re-pin it

`GraphViewer` derives the palette from the resolved theme and applies it as inline CSS vars on its container. `config.paletteColors` is a **sparse override** merged _on top_ of the theme palette (per-key) — never a full palette. Passing a complete palette re-pins node/edge colors to one theme and breaks theme switching (the colors stop following the toggle). Component CSS must reference the semantic tokens (`var(--token)`) and never hardcode hex/rgba — that is what lets a new theme be just a new set of token values. See `src/graph/graphConfig.ts` for the token catalog.

## Standalone wrapper

The standalone HTML wrapper has no theme button of its own — the in-graph toolbar is the single toggle. The adapter mirrors each `(mode, resolvedTheme)` onto page chrome: `body[data-theme]` carries the _mode_ (so the CSS chrome/logo rules, including the `system` `prefers-color-scheme` media queries, react) and the body palette is set from the _resolved_ theme.

Because pipelex emits `<body data-theme="system">` (its `ReactFlowTheme.SYSTEM`) and the standalone CSS styles `body[data-theme="system"]` statically, page chrome is themed correctly on first paint — before the JS bundle loads, and even if it never does (the HTML is CDN-loaded with SRI and designed to degrade). This is why the mode value is `system` end-to-end, never `auto`.

## The run form panel has a second palette behind it

Everything above governs the graph. `RunPanel` (`@pipelex/mthds-ui/form/react`) sits in **two** token systems at once, and they belong to different owners:

- **The panel chrome is ours.** `RunPanel.css` uses the same semantic tokens as everything else here — `--surface-panel`, `--border-default`, `--text-default`, `--color-accent-strong`. The panel applies them to its own container via `getPaletteForTheme`, because the graph's are inline on the ReactFlow container and the panel sits outside it. So it themes correctly standing alone, with no viewer in the tree.
- **The controls inside it are the form kernel's**, styled with Tailwind classes over shadcn's semantic tokens (`--background`, `--foreground`, `--primary`, `--ring`, …) — raw HSL triplets, a different naming scheme, and the host's to supply.

The panel's `theme` prop drives both halves: it picks our palette AND toggles the kernel's `.dark` class on the same container. One prop, because a panel whose chrome and controls disagreed on the theme would look broken in a way no host could fix from outside.

To make the controls follow your brand, scope shadcn overrides to the panel's stable container class:

```css
.mthds-run-panel {
  --primary: 142 71% 45%;
  --ring: 142 71% 45%;
}
```

**An automatic bridge between the two systems is deliberately not built.** Mapping our `--surface-*` / `--text-*` hex values onto shadcn's HSL triplets needs runtime conversion, and it is not obvious the form should follow the graph canvas rather than the host app's design system — a form living beside a graph is still part of the surrounding product. Left as an open question; ask if you want it.

See [run-form-panel.md](./run-form-panel.md) for the two CSS lanes and the silent-purge trap that comes with them.
