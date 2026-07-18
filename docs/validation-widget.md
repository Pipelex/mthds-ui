# Toolbar validation widget

An opt-in status widget in the graph toolbar that surfaces a host's validation lifecycle over the rendered method — built for the "static graph first" flow: a host renders `buildStaticGraphSpecFromToml(...)` instantly, kicks off its real validator in the background, and drives the widget from `validating` to a verdict without ever re-mounting or re-laying-out the graph.

## States

The widget renders only when `GraphViewer` receives a `validationState`; `undefined` (the default) disables the feature entirely — nothing is rendered, no behavior changes for existing consumers.

| State | Meaning | Rendering |
| --- | --- | --- |
| `validating` | A verdict is being produced | Spinner |
| `valid` | The validator accepted the method | Green check |
| `invalid` | The validator rejected the method | Red cross + issue-count badge |
| `error` | No verdict could be produced (validator unavailable, timeout, auth…) | Warning triangle |

Constants and types are exported from the package root: `VALIDATION_STATE`, `ValidationState`, `ValidationIssue`.

## Props

```tsx
<GraphViewer
  graphspec={spec}
  validationState="invalid"
  validationIssues={issues}
  onValidationIssueClick={(index, issue) => navigateToSource(index)}
/>
```

- `validationState?: ValidationState` — drives the widget; reactive, so a host typically flips it `validating → valid | invalid | error` as its validator progresses.
- `validationIssues?: ValidationIssue[]` — the rows listed in the dropdown; the badge shows their count. Each issue carries `severity` (`error`/`warning`), `message`, and optionally `context` (a locator chip such as `pipe.analyze_candidate` or a TOML path), `file` (owning-file basename), `suggestedFix` (human-readable fix line), `origin` (`validator` vs `static`), and the targeting fields below.
- `onValidationIssueClick?: (index, issue) => void` — row-click handler; wire it to source navigation in the host. Rows are only interactive when this is set.

The widget itself is **presentation-only**: the viewer never interprets issues, produces verdicts, or decides which issues to show per state — that policy belongs to the host (the VS Code extension, for instance, shows static diagnostics while `validating`, the validator's errors on `invalid`, and static warnings only on `valid`). The one exception is the pair of optional *targeting fields*, which the viewer resolves to graph nodes for the decorations below.

## Node decorations

Issues can target graph nodes, and targeted issues decorate them — same `validationIssues` prop, no extra wiring:

- `pipeRef?: string` — a **fully-qualified** pipe ref (`domain_code.pipe_code`, the same identity the pipelex runtime uses); decorates **every** rendered invocation of that exact pipe (a pipe can appear in several places in the graph). The match is on the qualified ref, never on the bare code: two domains may declare the same pipe code, and a bare match would ring both. An emitter that cannot qualify a bare code must leave the issue untargeted rather than guess. Build/parse refs with the exported `makePipeRef` / `parsePipeRef` helpers (last-dot split, mirroring pipelex's `QualifiedRef`; cross-package `alias->…` refs are opaque and parse to `null`).
- `nodeId?: string` — decorates one precise invocation (a GraphSpec node id such as `demo.main_flow/step_2`); wins over `pipeRef` when both are set.
- Neither field → the issue stays **panel-only**. There is no failure mode: a target that never became a node (e.g. a diagnostic about a pipe skipped during the static walk) simply doesn't decorate anything.

A decorated node renders a **severity ring** (outline — layout-neutral, node geometry never changes, so a verdict flip never re-runs layout or resets the viewport) and a **corner count badge** whose tooltip lists each issue's message and `Fix:` line. Worst severity wins per node (`error` over `warning`). **Folding rolls issues up**: a folded controller's badge aggregates its hidden descendants' issues, so folding never hides an error. Counts are per issue × invocation — a folded controller containing two invocations of a broken pipe shows 2, matching what expanding reveals.

`staticDiagnosticsToValidationIssues` auto-fills the targeting fields from diagnostic paths (`pipe.<code>[...]` qualified by the diagnostic's `domain_code` → `pipeRef`; a walk-phase node-id path containing `/` → `nodeId`), so static diagnostics decorate the graph for free — the parser/merger/builder stamp each `Diagnostic` with its declaring bundle's `domain_code` exactly for this. A diagnostic without a `domain_code` stays panel-only. Validator-side hosts fill `pipeRef`/`nodeId` themselves when they can derive a target.

### Interactions

- **Panel → graph**: clicking an issue row still calls `onValidationIssueClick` (host source-jump), and *additionally* pans the viewport to the issue's target node (`fitView` on that node, animated) and flashes a temporary halo around it. Panel-only issues just do the host callback.
- **Graph → panel**: clicking a node's count badge opens the validation panel (the dropdown open state lives in `GraphViewer` for exactly this reason; the toolbar reports toggle/outside-click/Escape through `onValidationOpenChange`).

The decoration internals (`buildValidationDecorations`, `applyValidationDecorations`, `resolveIssueTargetNodeId`, `NodeValidationSummary`) are exported from the package root for hosts that need the same mapping outside the viewer.

## Dropdown panel

Clicking the widget toggles a dropdown (`ValidationPanel`, exported with its pure helpers `validationLabel` and `validationPanelPlacement`) listing the issues with severity accent, locator chip, message, and `Fix:` line. It closes on outside click or Escape. Placement is derived from the toolbar anchor so the panel always unfolds toward the graph: top anchors drop down, bottom anchors open up, the vertical `center-left`/`center-right` bars open sideways away from their edge.

## Static diagnostics

The static-graph entry point exports `staticDiagnosticsToValidationIssues(diagnostics)` to project the parser/builder `Diagnostic[]` (from `buildStaticGraphSpecFromToml`) onto `ValidationIssue[]`, with the TOML-style path as the locator chip and `origin: "static"`.

## Styling

All widget and dropdown styles live in `GraphToolbar.css` (deliberately — hosts that copy toolbar styles, like the VS Code webview, get the widget for free) and use only palette tokens (`--color-success`, `--color-error`, `--color-warning`, surfaces, borders), so light/dark theming works unchanged.
