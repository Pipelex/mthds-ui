# Render `PipeSignature` nodes in the method graph

**Repo:** `mthds-ui` (this repo) — branch `dev`
**Type:** bug fix + new render variant + Storybook artifact
**Decision locked:** a `PipeSignature` node renders as a **distinct "stub" style** (an operator card visually marked as not-yet-implemented), not a plain operator card.

---

## TL;DR

The graph renderer (`@pipelex/mthds-ui`) crashes to a **blank panel** whenever a GraphSpec contains a node whose `pipe_type` is `"PipeSignature"`. `validateGraphSpec` only knows the six operator types and four controller types; `PipeSignature` is in neither, so it `throw`s `GraphSpecValidationError`, and because `GraphViewer` calls the validator *uncaught* inside a `useMemo`, the React render throws and nothing mounts.

Teach the taxonomy about `PipeSignature` (an operator-kind leaf), give it a distinct card style + badge, add a Storybook story that proves it renders, update the validator tests, then verify end-to-end against the real consumer (the VS Code extension) via a portal link and a headless harness.

This is **not** a change to the validation-errors feature in `vscode-pipelex`; it is a pre-existing gap in this library, exposed because the extension passes `--allow-signatures` so work-in-progress bundles produce signature-stub nodes.

---

## Background — why this happens (cold-start context)

### The consumer chain
`vscode-pipelex`'s method-graph panel runs `pipelex-agent validate bundle <file> --library-dir <dir> --allow-signatures --view --format json`. `--allow-signatures` makes the runtime treat an unimplemented pipe (e.g. a referenced pipe whose `.mthds` file is absent, or a `type = "PipeSignature"` declaration) as a valid **signature stub** instead of an error. The bundle then validates (`is_valid: true`) and the runtime emits a GraphSpec whose stub pipe is a node with:

```json
{ "kind": "operator", "pipe_type": "PipeSignature", "pipe_code": "build_scorecard",
  "status": "succeeded", "description": "...", "domain_code": "..." }
```

The extension hands that GraphSpec to this library's `GraphViewer` (via `editors/vscode/src/pipelex/graph/webview/adapter.ts` → `@pipelex/mthds-ui/graph/react`).

### The crash
`src/graph/react/viewer/GraphViewer.tsx` (~L270):

```ts
const graphspec = React.useMemo(
  () => (graphspecProp === null ? null : validateGraphSpec(graphspecProp)),
  [graphspecProp],
);
```

`validateGraphSpec` (`src/graph/validateGraphSpec.ts` ~L119):

```ts
if (!KNOWN_PIPE_TYPES.has(pipeType)) {
  fail(`${path}.pipe_type`,
    `unrecognized pipe class "${pipeType}" — add it to PipeOperatorType or PipeControllerType in types.ts`);
}
```

`KNOWN_PIPE_TYPES` derives from `PIPE_TYPE_PRESENCE` in `src/graph/types.ts`, which lists `PipeLLM | PipeExtract | PipeCompose | PipeImgGen | PipeSearch | PipeFunc` (operators) and `PipeSequence | PipeParallel | PipeCondition | PipeBatch` (controllers). `PipeSignature` is absent → `fail()` throws `GraphSpecValidationError` → the `useMemo` throws during render → `GraphViewer` crashes → the host webview's `#root` never mounts and stays hidden → **"nothing appears in the methods graph webview."**

### Confirmed
Reproduced headlessly by driving the built `graph.js` with a real GraphSpec: `#root` had zero children, no `.react-flow__node`, and `window.onerror` captured exactly the `GraphSpecValidationError` above. The local `dev` branch (v0.7.0, HEAD = "Validation + error handling for graphspec generation (#44)") does **not** fix it — `PipeSignature` appears nowhere in `src/`.

### Why "operator", not "controller"
A signature stub has no implementation, so it has no sub-pipes to expand into a controller group — the runtime emits it as a leaf with `kind: "operator"`. Treat `PipeSignature` as a member of `PipeOperatorType`. **Before editing, confirm the emitted node shape** against the runtime source `../pipelex/pipelex/graph/graphspec.py` (and the `pipe_registry` blueprint shape for a signature, used by the detail panel) — if a signature can ever surface as `kind: "controller"`, flag it and revisit; the steps below assume operator-leaf.

---

## What to change (all paths in this repo)

The pipe-type taxonomy is guarded by exhaustive `Record<…, …>` maps, so the type checker will point at every site that must be updated once you extend the union. The known sites:

| File | Change |
| --- | --- |
| `src/graph/types.ts` | Add `"PipeSignature"` to the `PipeOperatorType` union **and** to `PIPE_TYPE_PRESENCE`. `KNOWN_PIPE_TYPES` updates automatically. |
| `src/graph/react/nodes/pipe/PipeCardBase.tsx` | Add `PipeSignature: "Signature"` to `PIPE_TYPE_BADGES`; detect `isSignature` and apply the stub card + badge classes. |
| `src/graph/react/nodes/pipe/pipeCardRegistry.ts` | Add `PipeSignature: PipeCardBase`. |
| `src/graph/react/detail/PipeDetailPanel.tsx` | Add `PipeSignature: "Signature"` to its (separate) `PIPE_TYPE_BADGES`; make the `switch (blueprint.type)` handle a signature blueprint with a safe default. |
| `src/graph/react/nodes/pipe/__stories__/mockData.ts` | Add a `PipeSignature` entry to `MOCK_PIPES` (typed `Record<PipeOperatorType, …>`, so this is a compile error until added). |
| `src/graph/react/graph-core.css` | Add `.pipe-card--signature` + `.pipe-card-badge--signature` rules (dashed, muted). |
| `src/graph/react/nodes/pipe/__stories__/PipeCardRendering.stories.tsx` | Add the `PipeSignature` Storybook story + play test (the required artifact). |
| `src/graph/__tests__/validateGraphSpec.test.ts` | Add a case asserting a `PipeSignature` node validates. |

### 1. Taxonomy — `src/graph/types.ts`

```ts
export type PipeOperatorType =
  | "PipeLLM"
  | "PipeExtract"
  | "PipeCompose"
  | "PipeImgGen"
  | "PipeSearch"
  | "PipeFunc"
  | "PipeSignature"; // unimplemented stub (emitted under --allow-signatures)
```

and in `PIPE_TYPE_PRESENCE`:

```ts
  PipeFunc: true,
  PipeSignature: true,
```

### 2. Card — `src/graph/react/nodes/pipe/PipeCardBase.tsx`

Badge label:

```ts
const PIPE_TYPE_BADGES: Record<PipeType, string> = {
  // …existing…
  PipeFunc: "Func",
  PipeSignature: "Signature",
  // …controllers…
};
```

In `PipeCardBase`, alongside `isController`:

```ts
const isSignature = data.pipeType === "PipeSignature";
// …
const signatureClass = isSignature ? " pipe-card--signature" : "";
const badgeClass = isController
  ? "pipe-card-badge pipe-card-badge--controller"
  : isSignature
    ? "pipe-card-badge pipe-card-badge--signature"
    : "pipe-card-badge";
```

and the wrapper:

```tsx
<div className={`pipe-card ${dirClass}${controllerClass}${signatureClass}`}>
```

A signature stub typically has no `tags` (no model/prompt) and may have no `outputs` resolved — the card already guards on `data.inputs.length` / `data.outputs.length`, so it degrades cleanly. Do not require tags.

### 3. Registry — `src/graph/react/nodes/pipe/pipeCardRegistry.ts`

```ts
  PipeFunc: PipeCardBase,
  PipeSignature: PipeCardBase,
```

### 4. Detail panel — `src/graph/react/detail/PipeDetailPanel.tsx`

- Add `PipeSignature: "Signature"` to the `PIPE_TYPE_BADGES` map at the top of this file (it is a *second*, independent map — both must list every `PipeType`).
- The `switch (blueprint.type)` (~L234) renders type-specific detail (PipeLLM, PipeImgGen, …). Confirm what `type` a signature blueprint carries in the `pipe_registry` (check `../pipelex/pipelex/graph/graphspec.py`). Either add a `case "PipeSignature":` that renders a short "Signature — not yet implemented" note, **or** ensure the `switch` has a `default` that renders the generic blueprint view so an unknown/typeless blueprint never throws. Prefer the explicit case *plus* a defensive default. If you want full type-safety, add a `PipeSignatureBlueprint` to `PipeBlueprintUnion` in `types.ts`; this is optional (the runtime cast at ~L86 is already loose).

### 5. Stub styling — `src/graph/react/graph-core.css`

Add after the `.pipe-card--controller` block (~L386), reusing existing tokens (`--text-muted` is already in use; `--border-dashed` exists at ~L37):

```css
/* Signature (unimplemented stub) — dashed + muted so it reads as "declared, not built yet". */
.pipe-card--signature {
  --pipe-card-accent: var(--text-muted);
  border-left-style: dashed;
  opacity: 0.85;
}
.pipe-card-badge--signature {
  background: transparent;
  color: var(--text-muted);
  border: 1px dashed var(--text-muted);
}
```

Confirm both `--text-muted` and the surface tokens resolve in both themes (light/dark). Adjust if a dedicated `--color-signature*` token fits the existing palette convention better; keep it visually distinct from both operator (solid accent) and controller (tinted) cards.

### 6. Mock data — `src/graph/react/nodes/pipe/__stories__/mockData.ts`

Add to `MOCK_PIPES`:

```ts
  PipeSignature: {
    pipeCode: "build_scorecard",
    pipeType: "PipeSignature",
    description: "Build a scorecard from the job offer (signature only — not yet implemented).",
    status: "succeeded",
    inputs: [{ name: "job_offer", concept: "JobOffer" }],
    outputs: [{ name: "scorecard", concept: "Scorecard" }],
  },
```

### 7. Storybook artifact (required) — `src/graph/react/nodes/pipe/__stories__/PipeCardRendering.stories.tsx`

Follow the existing `BadgeLLM` / `BadgeFunc` pattern (a `GraphViewer` story over `toGraphSpec(MOCK_PIPES.X)` with a `play` assertion):

```tsx
export const BadgeSignature: Story = {
  args: { graphspec: toGraphSpec(MOCK_PIPES.PipeSignature), ...D },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const badge = await canvas.findByText("Signature");
    await expect(badge).toBeInTheDocument();
    await expect(badge.classList.contains("pipe-card-badge--signature")).toBe(true);
    // The card itself carries the distinct stub modifier.
    const card = badge.closest(".pipe-card");
    await expect(card?.classList.contains("pipe-card--signature")).toBe(true);
  },
};
```

Also consider a small visual-only story (no `play`) in `PipeCardNode.stories.tsx` so the dashed/muted treatment is reviewable in the Storybook UI. Run `npm run storybook` and eyeball it in both themes.

### 8. Validator test — `src/graph/__tests__/validateGraphSpec.test.ts`

Add under "validateGraphSpec — node fields" (mirror the existing `pipe_type` cases ~L189):

```ts
it("accepts a PipeSignature node (unimplemented stub emitted under --allow-signatures)", () => {
  const spec = /* the file's valid-spec factory */;
  (spec.nodes as Record<string, unknown>[])[0].pipe_type = "PipeSignature";
  expect(() => validateGraphSpec(spec)).not.toThrow();
});
```

Use whatever valid-spec builder the file already uses for its happy-path cases.

---

## Build & quality gate (in `mthds-ui`)

```bash
cd mthds-ui
npm run build      # tsup + postbuild standalone — regenerates dist/
npm run check      # lint + format:check + typecheck + test (vitest, incl. story play tests)
npm run storybook  # visual confirm: PipeSignature card is dashed/muted, badge "Signature", both themes
```

`npm run check` must be green. The exhaustive `Record` maps mean a missed site fails `typecheck`, not at runtime — lean on it.

**Checkpoint A:** taxonomy + card + registry + detail + CSS + story + test done; `npm run check` green; the new story renders the stub style in Storybook. Library side complete.

---

## End-to-end verification against the real consumer (`vscode-pipelex`)

The unit/story tests prove the card renders in isolation; this step proves the actual extension webview no longer blanks on a real signature-bearing GraphSpec.

### Wire the extension to this local build (portal link)

In `vscode-pipelex/editors/vscode/package.json`, point the dep at this repo, then install + rebuild:

```jsonc
"@pipelex/mthds-ui": "portal:../../../mthds-ui",
```

```bash
cd vscode-pipelex/editors/vscode
corepack yarn install        # resolves the portal symlink → node_modules/@pipelex/mthds-ui → ../../../mthds-ui
corepack yarn build          # build.mjs re-bundles graph.js from the local mthds-ui (it dedupes React for portals)
```

(Use `corepack yarn …`, not bare `yarn` — the repo pins Yarn 4 via corepack; the global shim is 1.x. The extension's `build.mjs` already special-cases the portal case for React, and esbuild resolves mthds-ui's own deps from `mthds-ui/node_modules`, so a plain `npm run build` of this repo first — step above — is required so `dist/` exists.)

### Reproduce a signature-bearing GraphSpec

Use any WIP bundle with a stub. Quick repro with the recruitment demo:

```bash
cd pipelex-demos/mthds-wip/recruitment_recursive
# Rename a referenced pipe's file out of the bundle so it becomes a signature stub:
mv build_scorecard.mthds build_scorecard.mthds2   # (already renamed in the report repro)
pipelex-agent validate bundle bundle.mthds --library-dir . --allow-signatures --view --direction top_down --format json > /tmp/sig-graphspec.json
# Confirm: is_valid:true and a node with "pipe_type":"PipeSignature".
```

### Headless render check (the harness used to find this bug)

Generate a standalone page that drives the freshly-built `graph.js` with that GraphSpec, serve it, and assert it mounts. Write the GraphSpec's `graphspec` field as the `setData` payload:

```bash
cd vscode-pipelex/editors/vscode/dist/pipelex/graph/webview
# Build test-harness.html that: stubs acquireVsCodeApi, loads ./graph.js, then
# window.dispatchEvent(new MessageEvent('message',{data:{type:'setData',uri:'file:///x',sourceKind:'mthds',
#   graphspec:<the .graphspec from /tmp/sig-graphspec.json>,
#   config:{direction:'TB',showControllers:true,foldMode:'folded',nodesep:40,ranksep:60,edgeType:'smoothstep',initialZoom:0.8,panToTop:false,paletteColors:{}}}}))
# Capture window.onerror into window.__errors so a thrown GraphSpecValidationError is visible.
python3 -m http.server 8799 >/tmp/httpd.log 2>&1 &
B="$HOME/.claude/skills/gstack/browse/dist/browse"
$B goto "http://localhost:8799/test-harness.html"; $B wait --networkidle; sleep 2
$B js "JSON.stringify(window.__errors)"                          # expect: []
$B js "document.querySelectorAll('.react-flow__node').length"    # expect: > 0
$B js "document.getElementById('root').childElementCount"        # expect: > 0
```

Pass criteria: `window.__errors` is empty (no `GraphSpecValidationError`), `.react-flow__node` count > 0, and the signature node shows the dashed/muted "Signature" card. Serve over `http://` not `file://` — `file://` masks the real error as an opaque "Script error".

### Revert the link before committing `vscode-pipelex`

The portal link is local-only. Restore it so that repo's branch stays clean:

```bash
# in vscode-pipelex/editors/vscode/package.json, set back to the published spec:
"@pipelex/mthds-ui": "npm:<published-version>",
corepack yarn install
```

**Checkpoint B:** the extension webview renders the signature-bearing graph (no blank, no thrown error); portal link reverted.

---

## Release / rollout

1. **`mthds-ui`:** bump `version` (0.7.0 → next), add a changelog entry ("Render PipeSignature stub nodes in the method graph"), publish `@pipelex/mthds-ui`.
2. **`vscode-pipelex`:** bump `"@pipelex/mthds-ui": "npm:<new version>"` in `editors/vscode/package.json`, `corepack yarn install`, `make ext`, and add a CHANGELOG entry (root `CHANGELOG.md`; the `editors/vscode/CHANGELOG.md` is generated). Note in that entry that WIP bundles with signature stubs now render in the method graph instead of showing a blank panel.
3. **`playroom`** (also consumes `@pipelex/mthds-ui`): bump there too if it pins a version and you want the fix.

**Checkpoint C:** published, consumers bumped, changelogs updated.

---

## Non-goals (explicit)

- **No error boundary around `validateGraphSpec` in `GraphViewer`.** Considered (it would make any *future* unknown `pipe_type` degrade to a message instead of a blank crash) but **deferred by decision** — the chosen scope is rendering `PipeSignature` properly, not hardening the render path. If you want it later, wrap the `useMemo` validator call in try/catch and return a small error state; track separately.
- No change to `vscode-pipelex`'s validation-error display feature — that is correct as-is and unrelated.
- No change to how the runtime emits signatures (`pipelex`/`pipelex-api`); this is purely the renderer catching up to what the runtime already emits under `--allow-signatures`.

---

## Key files (quick reference)

| File | Why |
| --- | --- |
| `src/graph/types.ts` | `PipeOperatorType`, `PIPE_TYPE_PRESENCE`, `KNOWN_PIPE_TYPES` — the source of truth the validator reads. |
| `src/graph/validateGraphSpec.ts` | Throws on unknown `pipe_type` (~L119). No edit needed once the taxonomy includes `PipeSignature`; add a test. |
| `src/graph/react/viewer/GraphViewer.tsx` | Calls `validateGraphSpec` uncaught in a `useMemo` (~L270) — why the throw blanks the panel. |
| `src/graph/react/nodes/pipe/PipeCardBase.tsx` | Shared card; badge map + the new `isSignature` styling hook. |
| `src/graph/react/nodes/pipe/pipeCardRegistry.ts` | `pipe_type → card component` map. |
| `src/graph/react/detail/PipeDetailPanel.tsx` | Second badge map + the `blueprint.type` switch (needs a safe path for signatures). |
| `src/graph/react/nodes/pipe/__stories__/mockData.ts` | `MOCK_PIPES` (typed `Record<PipeOperatorType,…>`) — forces the new mock. |
| `src/graph/react/nodes/pipe/__stories__/PipeCardRendering.stories.tsx` | Where the required Storybook story lives. |
| `src/graph/react/graph-core.css` | Card styling; add the `--signature` modifiers near `--controller` (~L386). |
| `src/graph/__tests__/validateGraphSpec.test.ts` | Validator tests; add the accept-`PipeSignature` case. |
| `../pipelex/pipelex/graph/graphspec.py` | Cross-repo source of the GraphSpec model — confirm the emitted signature node + blueprint shape. |
