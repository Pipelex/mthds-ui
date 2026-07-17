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
- `validationIssues?: ValidationIssue[]` — the rows listed in the dropdown; the badge shows their count. Each issue carries `severity` (`error`/`warning`), `message`, and optionally `context` (a locator chip such as `pipe.analyze_candidate` or a TOML path), `file` (owning-file basename), `suggestedFix` (human-readable fix line), and `origin` (`validator` vs `static`).
- `onValidationIssueClick?: (index, issue) => void` — row-click handler; wire it to source navigation in the host. Rows are only interactive when this is set.

The widget is **presentation-only**: the viewer never interprets issues, produces verdicts, or decides which issues to show per state — that policy belongs to the host (the VS Code extension, for instance, shows static diagnostics while `validating`, the validator's errors on `invalid`, and static warnings only on `valid`).

## Dropdown panel

Clicking the widget toggles a dropdown (`ValidationPanel`, exported with its pure helpers `validationLabel` and `validationPanelPlacement`) listing the issues with severity accent, locator chip, message, and `Fix:` line. It closes on outside click or Escape. Placement is derived from the toolbar anchor so the panel always unfolds toward the graph: top anchors drop down, bottom anchors open up, the vertical `center-left`/`center-right` bars open sideways away from their edge.

## Static diagnostics

The static-graph entry point exports `staticDiagnosticsToValidationIssues(diagnostics)` to project the parser/builder `Diagnostic[]` (from `buildStaticGraphSpecFromToml`) onto `ValidationIssue[]`, with the TOML-style path as the locator chip and `origin: "static"`.

## Styling

All widget and dropdown styles live in `GraphToolbar.css` (deliberately — hosts that copy toolbar styles, like the VS Code webview, get the widget for free) and use only palette tokens (`--color-success`, `--color-error`, `--color-warning`, surfaces, borders), so light/dark theming works unchanged.
