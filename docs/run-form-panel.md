# The run form panel

`RunPanel` renders a pipe's input form: the fields, the readiness verdict on the Run button, and the wire-ready payload a run receives. It ships from its own entry point, `@pipelex/mthds-ui/form/react`, over the form kernel `@pipelex/mthds-form`.

The dividing line, stated once, because everything below follows from it: **anything that decides what a field IS, or whether the form MAY run, comes from the kernel. Anything that decides where things sit on screen belongs to this library.** The panel never reads a `json_schema` to make a rendering decision and never sniffs a value's shape. That is what keeps a change to the kernel's derivation invisible here — when the kernel swaps its heuristics for a server-derived descriptor, nothing in this repo moves.

## Installing

The kernel is an **optional peer dependency**. Graph-only consumers install nothing extra and nothing changes for them; a consumer that wants the form installs it alongside:

```bash
npm install @pipelex/mthds-ui @pipelex/mthds-form mthds
```

`mthds` is in that line because the kernel declares it a required peer of its own and re-exports its protocol types; a package manager with peer auto-installation adds it either way, but naming it keeps the install correct for one that does not. This library never imports it.

It is a peer, not a dependency, for a reason that bites silently if you get it wrong: `FieldStringsProvider` and `FieldPresentationProvider` are React contexts. If this library carried its own nested copy of the kernel, a provider you mount above the panel would not resolve inside it — the panel would read the kernel's defaults while your app read yours, with nothing in the console to say why. One instance, shared, is the only arrangement that works.

The same reasoning is why the panel lives behind `./form/react` and never leaks into `./graph/react`. An eslint rule (`no-restricted-imports` in `eslint.config.mjs`) confines every `@pipelex/mthds-form` import to `src/form/**`, and `make smoke-pack` checks the built package from a consumer that deliberately has no kernel installed.

## Using it

```tsx
import { getPipeInputForm, getPipeIOContract } from "@pipelex/mthds-form";
import { RunPanel } from "@pipelex/mthds-ui/form/react";
import "@pipelex/mthds-ui/form/react/RunPanel.css";

function MethodPanel({ contracts, inputForm, domain, pipeCode, onExecute }) {
  const [values, setValues] = useState({});
  // Note the argument order — the kernel's README currently shows it wrong.
  const contract = getPipeIOContract(contracts, domain, pipeCode);
  const descriptor = getPipeInputForm(inputForm, domain, pipeCode);
  if (!contract || !descriptor) return null;

  return (
    <RunPanel
      contract={contract}
      descriptor={descriptor}
      values={values}
      onValuesChange={setValues}
      onRun={onExecute}
      title={pipeCode}
      theme="dark"
    />
  );
}
```

`contracts` and `inputForm` are the `pipe_io_contracts` and `input_form` maps from the same `/validate` call that produced your graph spec — two sibling artifacts, returned together when you ask for both views (`views: ["pipe_io_contracts", "input_form"]`). Hosts that can actually run a method already hold them, so feeding the panel costs two props.

**Both are required, and the failure of omitting one is silent.** The descriptor states what each field IS — kind, constraints, presence, gating, and the authored order the contract's `inputs` map does not carry — and since kernel `0.5.0` it is what drives the derivation; the contract is co-walked beside it for the facts the descriptor deliberately omits (a scalar's wrapper property, a nested array's bounds). The kernel's `fieldsForContract` returns `[]` unless it has both, so a panel given only a contract renders with no fields and no error. Resolve them together, and bail together, as above.

### Props

| Prop                        | Required | What it does                                                                                                                                                                                                                                                                                                                                |
| --------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `contract`                  | yes      | The pipe's `PipeIOContract` — the kernel's type. See "Why not a GraphSpec" below.                                                                                                                                                                                                                                                           |
| `descriptor`                | yes      | The pipe's `PipeInputFormDescriptor` — the contract's sibling, and what decides how every field renders. Look it up with `getPipeInputForm`.                                                                                                                                                                                                 |
| `values` / `onValuesChange` | yes      | Fully controlled field values. The host owns the state; the panel never holds a copy.                                                                                                                                                                                                                                                       |
| `onRun`                     | yes      | Fires **only after the kernel's run gate passes**, with the `{concept, content}` payload a run expects.                                                                                                                                                                                                                                     |
| `running`                   | no       | A run is in flight: the fields and the button go inert. **Set it synchronously inside `onRun`** — see "Why `running` has to be set synchronously".                                                                                                                                                                                          |
| `env`                       | no       | Ambient `FieldEnv` passed to every control. For `disabled`, `onDropFile` and `resolveUrl` your value wins **per key** and the panel fills in only what you left undefined. `uploadingIds` is the exception: it is the **union** of your set and the panel's, so an upload the panel started can never be hidden by a tracker you also pass. |
| `uploadFile`                | no       | Stores a dropped file and returns its URL. See "Files" below.                                                                                                                                                                                                                                                                               |
| `title`                     | no       | Panel header. There is no default — the host names the pipe.                                                                                                                                                                                                                                                                                |
| `theme`                     | no       | `"dark"` or `"light"`. Drives both this library's palette and the kernel's `.dark` class. Defaults to `"light"`.                                                                                                                                                                                                                            |
| `translate`                 | no       | Renders the whole error summary in your language — the kernel's per-error keys and the panel's own `runPanel.*` lines alike. English by default.                                                                                                                                                                                            |
| `idPrefix`                  | no       | Makes this panel's control DOM ids predictable — a field at path `cv` becomes `id="<idPrefix>-cv"`, and `""` writes the path unprefixed. See "Several panels on one page" below.                                                                                                                                                            |
| `className`                 | no       | Appended to the container's class list.                                                                                                                                                                                                                                                                                                     |

### What the host still owns

This library renders; it never executes. `onRun` hands you a payload and stops there — no API client, no upload, no storage-URL resolution. That is deliberate, and it is the same boundary the kernel draws with its own `FieldEnv`.

**Files.** The panel does the bookkeeping and you do the transfer: supply `uploadFile(file, fieldId)`, and the panel marks the field busy while it runs and writes `{ url, filename }` back at the field's dotted path when it resolves. A failed upload is swallowed — you own how a failure is announced, because you own the transport — and the field simply stays empty. That holds however your function fails: `uploadFile` need not be `async`, so one that validates before it starts the request throws where an `async` spelling of the same body would reject, and the panel treats the two identically. It has to, or the form would wedge on the difference — a field marked busy by a drop whose upload never began stays busy, and a busy field cannot be retried. If you would rather own the whole loop, pass `env.onDropFile` and `env.uploadingIds` instead; yours win.

Two consequences of an upload being slow, both handled here so a host does not have to think about them.

**Run is disabled while any upload the panel knows about is in flight**, including uploads you report through `env.uploadingIds`. Readiness alone is not enough, because a non-gating file input — an optional one, or a variable-length plural one, since `Concept[]` never gates on being empty — never counts toward readiness at all: without this, Run stays live right through such a field's upload and the method runs with the file simply missing. **Every condition that disables Run also blocks the submit path**, not just this one: a run already in flight, an unmet readiness verdict, and an upload in progress are one expression, read in both places. That matters because `form.requestSubmit()` ignores the disabled button entirely — so run the form from your own button if you like, and you still cannot start a duplicate run, send a blank required text input, or send without a file that is on its way. The duplicate-run half of that carries one condition, below. (The keyboard is held by the button alone, and correctly: Run is the form's only submit button, so it is the default button, and implicit submission on a disabled default button does nothing.)

**Why `running` has to be set synchronously.** "You cannot start a duplicate run" is true for as long as `running` is true, and `running` is yours — the panel reads it and never sets it. So set it inside `onRun` before any `await`, not once your API answers. A host that does the latter leaves Run enabled for the whole round trip, and a second click in that window passes the same `blocked === false` the first one did and starts a second execution. The panel cannot close **that** window itself: it is told when a run STARTS and never that one finished, so a lock held for the lifetime of a run would have no release, and a host that never passes `running` would be wedged after its first run — a worse failure than the one it would prevent, and it would put hidden run state inside a component whose whole design is that the host owns the state.

**What the panel does close is synchronous re-entry**, which is a different window and needs no such lock. `blocked` is computed during a render, so two `requestSubmit()` calls in one synchronous block both read the same render and both used to pass — including for a host doing everything above correctly, because React has not re-rendered between the two calls. A submit that passes the gate now latches until the end of the current task, released on a microtask that is queued unconditionally and therefore always runs. It holds nothing across a render and cannot wedge; `LatchReleasesWithoutAnyStateUpdate` pins that a host whose `onRun` schedules no state update at all still runs on every click. Setting `running` synchronously remains your job for everything longer than one task.

**The readiness line beside Run is the button's accessible description**, associated with it by `aria-describedby` whenever readiness is what is holding Run back. It is the only thing on screen that says _why_ the button is dimmed, and a disabled button is out of the tab order, so nobody reaches that line by walking the controls. If you restyle the footer, keep the two associated — that id is generated with `useId`, so this association survives several panels on one page.

**Several panels on one page are now safe, including for label-driven focus.** A control's DOM id used to be the field's dotted path verbatim (`match.score`), which is unique within one form but not within a document — so two panels rendering the same contract emitted duplicate ids and each `<label for>` bound to the first. Since kernel `0.5.0` the id is namespaced (`<prefix>-<path>`) while the value path itself is unchanged, so the write-back and the upload bookkeeping are untouched. Left alone, the prefix comes from `useId`: unique per panel and hydration-stable, which is what makes multiple panels correct by default.

**Pass `idPrefix` when something outside must address a control** — `getElementById`, a deep link that focuses a field, an end-to-end selector — because a `useId` prefix is deliberately opaque. Doing so moves the uniqueness obligation to you: the prefix scopes the whole panel, so it must be unique in the document, and `""` restores the bare path ids along with the collision they had. A host mounting panels in separate React roots can instead give each root its own `identifierPrefix`.

**The write-back merges into the latest values, not the ones captured when the drop happened**, so edits made to other fields while an upload was running survive it — and so does a sibling upload that finishes in the same instant, which matters as soon as a pipe takes two files (`candidate_screening.screen_candidate` takes a `cv` and a `job_offer`).

An upload is also tied to the form generation it started under, and a result that resolves after you have switched pipes is discarded — as is its bookkeeping. Switching **back** does not revive it: the upload was abandoned when you left, so it stays abandoned rather than landing in a form that spent the intervening time not marking it. Nor does it matter _how_ you left: changing `contract` and unmounting the panel outright are the same departure, so `<RunPanel key={pipeRef} …>` — the ordinary way to reset a child per entity — is abandoned exactly as a prop change is, even though your `values` state lives above the key and is still very much alive. That holds however the switch reached the panel, including from a fetch continuation or a subscription rather than a click, which is a distinction React makes and this matters to: see the code comment on the marker. This matters more than it sounds: two pipes of the same method routinely share an input name — `recruitment.cv_screening` and `recruitment.extract_cv` both take a required `cv` — so without this the file chosen for one would land in the other looking like a deliberate answer, gating satisfied, ready to send. The bookkeeping half is the same problem one step later: switching pipes releases the gate and re-opens the dropzone, so the user can start a second upload on that shared field id, and a departed upload finishing must not un-mark the one that replaced it. The consequence for a host is that **`contract` is referentially significant**: pass the object your lookup returns rather than rebuilding it each render, or uploads in flight will be thrown away. (A host rebuilding it each render is already rebuilding every field, since the field list memoizes on the same reference.)

**Already-stored files.** Pass `env.resolveUrl` so a `pipelex-storage://` URI can be previewed.

## What to know about the gate

**A plural input gates only when the method declared a count.** `Concept[]` is variable-length and its empty form IS the empty list, so it never holds Run back and travels as a bare `[]`. `Concept[N]` is not that: the method has said how many items it wants, so a short list, an over-full one, and a list whose rows were added but left blank all keep the button dark, and a started row is held to whatever its item concept requires. The count itself is enforced by the schema the contract already carries, so the two surfaces cannot disagree about it. Nothing in this repository's fixture corpus declares a fixed-count input, so if you are looking for a story that shows this, there is not one — the corpus's single `fixed` multiplicity is on an output.

**The gate catches an empty required text input, and it did not always.** Schema validation alone never could: the value reaches ajv as `{ text: "" }`, a perfectly valid string, and a content model carries no `minLength`. So for a while the Run button and the gate refused different things — readiness noticed the blank, the gate waved it through, and only the button standing in front of the submit path kept the two from diverging in practice. The kernel's `gateRunInputs` closes it by re-running readiness' own predicates after ajv, over the same derived fields, which makes the button's verdict and the gate's one invariant rather than two that resemble each other. A blank required input now comes back named, whether the run was started by the button or by a host calling `requestSubmit()` itself. Whitespace counts as blank.

**A verdict can be invalid with nothing to name.** `validateRunInputs` reports `missingInputs` by variable name when it can, but a wrong value shape or a nested mismatch legitimately produces an invalid verdict with an empty `missingInputs`. The panel falls back to describing the ajv errors, so a blocked run is never undiagnosable.

**Which of those you get is the kernel's call, so `translate` covers all of them.** The summary has three routes — the named variables, the described ajv errors, and a last-resort line when there is neither — and nothing about your form tells you in advance which one a rejected run will take; a kernel version has already reclassified the same input from one route to another. So `translate` is keyed on `RunPanelMessageKey`, which is the kernel's `ValidationMessageKey` plus the two lines the panel writes itself (`runPanel.missingInputs`, carrying the names as an `{inputs}` value, and `runPanel.fillRequired`). Handle all of them; a translator that covers only some renders a summary that silently reverts to English on the inputs you did not anticipate.

**A rejected submit's summary dies with the form it was about.** It clears when the panel moves the values (an edit, an upload landing) and when you switch `contract`, on the same principle both times: it describes one pipe's inputs at one moment, and showing it over anything else is worse than showing nothing. The one gap, deliberate, is a host that resets `values` behind the panel's back without changing `contract` — see `wip/adopt-form/deferred-upload-race-residues.md` for why clearing on a `values` identity change would cost more than it buys.

The wire format carries two exceptions, both the kernel's and both visible in the payload `onRun` receives: a **blank optional** input is omitted entirely (so the runtime records a real absence rather than an empty string), and an **empty plural** ships bare as `[]` without the `{concept, content}` envelope (the envelope routes an empty list to a factory that cannot type it).

## Why not a `GraphSpec`

The panel takes a contract, not a graph spec, and will not grow a `GraphSpec` adapter. Building one would mean synthesizing array schemas for plural slots from `StuffSpecInfo.multiplicity` and trusting `src/static-graph/parseMthdsBundle.ts`'s `deriveJsonSchema`, which is a deliberately thin local reconstruction. Both are the "derive it locally" this component exists not to do — and a local guess that disagrees with the runtime produces a form that looks right and submits wrong.

Static hosts with no network (a VS Code webview, a TOML-only playground) are served by `@pipelex/runtime` deriving the descriptor locally; when that reaches the kernel it feeds this same `contract` prop. This library never grows a guesser.

## Styling, and the trap in it

Two stylesheets, two owners.

**The panel chrome is ours.** `RunPanel.css` styles the container, the header, the footer, the Run button and the error summary, using this library's own palette tokens. The panel applies those tokens to its own container (the graph's are scoped to the ReactFlow container, which the panel sits outside), so it themes correctly standing alone. Import it once:

```ts
import "@pipelex/mthds-ui/form/react/RunPanel.css";
```

**The controls are the kernel's, and this library brings their styling with it.** They are Tailwind classes over shadcn semantic tokens, and both React entries (`./form/react` and `./graph/react`) import the kernel's prebuilt sheet themselves. You add nothing.

That was not always true, and the history is the reason the current shape looks indirect. Until v0.20.0 the host had two mutually exclusive lanes: widen its Tailwind `content` globs into `node_modules/@pipelex/mthds-form/dist`, or load the prebuilt sheet by hand. Nobody took the first lane successfully — a content glob stops at the host's own source, `node_modules` is off the sweep, and a host that forgot got a form that was _mostly_ styled, because most of the controls' classes are used elsewhere in a typical app and survive the purge coincidentally. Only the ones unique to the controls disappeared: the input focus ring and border, the placeholder colour, the prose textarea's minimum height, the input background tint, the dropzone's drag-active state. What you saw read like someone broke the design system, not like a missing glob.

v0.20.0 made the import our problem and shipped it raw, which traded that failure for a louder one. `styles.css` is a **complete** Tailwind build — preflight, plus every utility unprefixed and unscoped — and it is code-split, so it arrives in the host's `<head>` after the host's own stylesheet the moment a graph mounts. From that instant it won every tie it had no business winning: its bare `.hidden { display: none }` outranked the host's `.sm\:inline`, blanking every `class="hidden sm:inline"` label in the app at every width, and its preflight `*, ::before, ::after { border: 0 solid #e5e7eb }` replaced the host's default border colour, painting a pale hairline under anything with a border width and no explicit colour class.

v0.21.0 keeps the import and fixes the collision with a **cascade layer**. `src/styles/form-kernel.css` is the whole mechanism:

```css
@import "@pipelex/mthds-form/styles.css" layer(mthds-form);
```

Layered rules lose to unlayered rules regardless of source order, so a host's own Tailwind keeps every declaration it makes, and we still supply the classes it never generated. Nothing changes for a host with no Tailwind: a layer only decides conflicts, and there are none to decide. `theme.css` stays out either way — it defines the semantic tokens (`--background`, `--border`, …) a shadcn host already owns, and pulling it in would let our copy repaint the host's palette.

**What this means for you:** import `RunPanel.css` for the chrome, and nothing else. Do not add the kernel to your `content` globs and do not import `styles.css` yourself — either one puts a second, unlayered copy of the same utilities in the page, which is exactly the state the layer exists to prevent. `src/styles/__tests__/formKernelLayer.test.ts` guards the shape of the wrapper against a future edit that reinstates the direct import or drops the `layer()`.

The one place the layer is deliberately absent is the **standalone bundle**, which is a plain `readFileSync` concatenation with no module resolution — it ships the resolved sheet listed in `scripts/standaloneCssFiles.mjs`, unlayered, ordered with the vendor base sheets so our own component CSS still has the last word. There is no host stylesheet in a self-contained HTML for it to lose a tie to.

### The theme bridge, and the hook for overriding tokens

`theme` does double duty: it selects this library's palette for the chrome **and** toggles the kernel's `.dark` class on the same container, which is how the shadcn tokens behind the controls flip. One prop, both halves — a panel whose chrome and controls disagreed on the theme would look broken in a way no host could fix from outside.

The container carries a stable class name, **`mthds-run-panel`**, as a documented hook. Scope shadcn token overrides to it when you want the form to follow your design system rather than the defaults:

```css
.mthds-run-panel {
  --primary: 142 71% 45%;
  --ring: 142 71% 45%;
}
```

A full automatic bridge — mapping this library's `--surface-*` / `--text-*` values onto shadcn's raw HSL triplets — is **deliberately not built**. It needs runtime hex→HSL conversion, and it is not obvious the form should follow the graph canvas rather than the host app's design system. Ask for it if you want it.

### The one place the chrome does not follow the palette: the Run button

Everything in `RunPanel.css` reads this library's palette tokens except the Run button's background and label, which are literal colours — one per theme. Overriding `--color-accent-strong` therefore re-themes the graph and leaves the Run button where it is. That is the intended behaviour, not an oversight.

The reason is contrast. A 13px/600 label needs 4.5:1 for WCAG AA, and white on `--color-accent-strong` reaches neither 4.5 in the light palette (4.10:1) nor in the dark one (3.68:1). The button is the primary call to action, so it is held to the line even at the cost of the token indirection, and the palette is left alone rather than darkened to fix a single button — `--color-accent-strong` is a graph token, and this button is the only place in the library that puts text on it. `src/form/__tests__/contrast.test.ts` pins both literals to the AA line.

If you need the button in your own brand colour, restyle it directly and keep the ratio. Name both selectors — the dark rule is `.mthds-run-panel.dark .mthds-run-panel-run`, so a single-class override loses to it in the dark theme and silently applies to only half your app:

```css
.mthds-run-panel .mthds-run-panel-run,
.mthds-run-panel.dark .mthds-run-panel-run {
  background: #6b21a8; /* white label: 8.72:1 */
}
```

## Fixtures

The artifacts the stories render are **generated**, never hand-written:

```bash
make fixtures-contracts        # all bundles, offline, no inference
make fixtures-contracts ONLY=pipeline_09
```

This is not ceremony. A hand-authored pair gets the standard's field taxonomy subtly wrong in ways nobody guesses, so a form tested against invented artifacts is tested against inputs no method produces. It also cannot be checked by anything here: the two artifacts are consumed together, and one invented to match the other is self-consistent and still wrong.

(The specific drift this warning used to name — `native.Date` rendering as _prose_ and wrapping as `{ text }` — is **resolved** in kernel `0.5.0`: the wire states `native.Date` as an object over `DateContent {date, time}`, and the store and run payload now carry that declared shape. It was a real wire-visible change for hosts, not just a rendering one.)

Because both artifacts are projections of what a pipe **declares**, they need no execution, which is why the pass is its own fast offline one and why the form fixtures rebuild without every bundle in the corpus being currently runnable. No pipelex CLI emits either view yet, so `scripts/dump_validate_views.py` calls the canonical builders through the pipelex venv and emits both from one library window — which is what makes them share one key set. It is retired the moment the CLI can do it (ledger item `L-260823-d042fd`, owned by `pipelex`).

## Developing against a local form kernel

When a change spans this panel and the kernel underneath it, point `node_modules` at the sibling checkout instead of npm:

```bash
make use-local     # or: make ul   — build ../mthds-form, pack it, install the tarball
make use-npm       # or: make un   — back to the published version package.json pins
```

`use-local` is a **tarball install, not a symlink**, and that is the whole point. The kernel ships React contexts, which is why it is an optional peer at all (see "Installing" above); a symlinked checkout is a second module identity for Vite to resolve, so a provider mounted above the panel would silently fail to resolve inside it — the exact failure the peer arrangement exists to prevent. The tarball puts one real directory in `node_modules`. It is a snapshot, so **re-run `make use-local` after every kernel edit**; nothing watches.

Two details the targets handle for you. They clear Vite's pre-bundle cache, because `.storybook/main.ts` names the kernel in `optimizeDeps.include` and a local build usually carries the _same_ version string as the published one — the optimizer's hash would not change and Storybook would keep serving the stale copy. And they install with `--no-save`, so `package.json` is never rewritten: the kernel is named twice there, in `peerDependencies` and `devDependencies`, and the two must agree. Moving that version is a reviewed change that belongs to the `/bump-mthds-form` skill, not a side effect of leaving dev mode.

A local kernel whose version falls outside the pinned range (developing the next minor, say) installs fine — the peer is declared optional, so npm does not treat the mismatch as a conflict. It is also the case where forgetting `make use-npm` is easiest to miss, so check what is actually installed before trusting a green run:

```bash
node -p "require('./node_modules/@pipelex/mthds-form/package.json').version"
```

## Where things live

```
src/form/
  runGate.ts                    # the submit path, React-free and unit-tested
  __tests__/runGate.test.ts
  react/
    RunPanel.tsx                # the panel
    RunPanel.css                # panel chrome only
    index.ts                    # the ./form/react entry
    __stories__/
      RunPanel.stories.tsx      # field kinds, readiness, running, invalid submit
      GraphWithRunPanel.stories.tsx  # GraphViewer → onNodeSelect → RunPanel
      contracts/_generated.contracts.ts
```
