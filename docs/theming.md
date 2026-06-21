# Theming

`GraphViewer` renders in one of two **resolved themes** — `dark` or `light` — chosen by a **theme mode** the user selects. The two concepts are deliberately separate.

## Mode vs resolved theme

- **Mode** (`GraphThemeMode` = `dark | light | auto`) is the user's _selection_. It is what the toolbar cycles, what gets persisted, and what `onThemeChange` reports first. Exposed via the `theme` prop / `config.theme`.
- **Resolved theme** (`GraphTheme` = `dark | light`) is the binary value actually used to pick the palette (`getPaletteForTheme`) and the container class. `auto` resolves to the environment theme; `dark`/`light` resolve to themselves.

```
mode (dark|light|auto) ─┐
                        ├─► resolvedTheme (dark|light) ─► getPaletteForTheme() + container class
systemTheme (dark|light)┘    resolvedTheme = mode === "auto" ? systemTheme : mode
```

The `dark`/`light` overlap between the two types is intentional: a resolved theme is also a valid mode.

## Default

`DEFAULT_GRAPH_CONFIG.theme` is `auto` — the graph follows the host environment out of the box. To pin a fixed appearance, pass `theme: "dark"` (or `"light"`) explicitly.

## How `auto` resolves

- **Browser / standalone:** follows `prefers-color-scheme` **live** via `useSystemTheme`, re-resolving on the media query's `change` event (no reload).
- **Host-injected:** when the `systemTheme` prop is set, it is authoritative — the host owns detection and its re-renders drive updates. Use this where `prefers-color-scheme` is unreliable (e.g. a VS Code webview reading the editor's `vscode-dark` / `vscode-light` body class via a `MutationObserver`).
- **SSR / no `matchMedia`:** defaults to `dark` and never throws.

`detectSystemTheme()` exposes the one-shot read for non-React callers (e.g. painting initial page chrome before any `onThemeChange` fires).

## The toolbar toggle

The built-in toolbar cycles `auto → light → dark → auto`. Each mode shows a distinct icon — monitor (`auto`) / sun (`light`) / moon (`dark`) — and an accessible label naming the current mode and the one a click switches to. Hide it with `showThemeToggle={false}` when the host fully controls the theme from outside.

## `onThemeChange`

`onThemeChange?: (mode, resolvedTheme) => void` fires on toggle clicks, on external prop/config updates, and when `auto` re-resolves on an environment change. It reports **both** values: `resolvedTheme` keeps page chrome outside the container in sync, `mode` is what a host persists.

## The palette is the contract — never re-pin it

`GraphViewer` derives the palette from the resolved theme and applies it as inline CSS vars on its container. `config.paletteColors` is a **sparse override** merged _on top_ of the theme palette (per-key) — never a full palette. Passing a complete palette re-pins node/edge colors to one theme and breaks theme switching (the colors stop following the toggle). Component CSS must reference the semantic tokens (`var(--token)`) and never hardcode hex/rgba — that is what lets a new theme be just a new set of token values. See `src/graph/graphConfig.ts` for the token catalog.

## Standalone wrapper

The standalone HTML wrapper has no theme button of its own — the in-graph toolbar is the single toggle. The adapter mirrors each `(mode, resolvedTheme)` onto page chrome: `body[data-theme]` carries the _mode_ (so the CSS chrome/logo rules, including the `auto` `prefers-color-scheme` media queries, react) and the body palette is set from the _resolved_ theme.
