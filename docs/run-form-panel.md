# The run form panel

`RunPanel` renders a pipe's input form: the fields, the readiness verdict on the Run button, and the wire-ready payload a run receives. It ships from its own entry point, `@pipelex/mthds-ui/form/react`, over the form kernel `@pipelex/mthds-form`.

The dividing line, stated once, because everything below follows from it: **anything that decides what a field IS, or whether the form MAY run, comes from the kernel. Anything that decides where things sit on screen belongs to this library.** The panel never reads a `json_schema` to make a rendering decision and never sniffs a value's shape. That is what keeps a change to the kernel's derivation invisible here — when the kernel swaps its heuristics for a server-derived descriptor, nothing in this repo moves.

## Installing

The kernel is an ordinary **dependency** of this package, so install this package alone:

```bash
npm install @pipelex/mthds-ui
```

**Do not declare `@pipelex/mthds-form` yourself, and reach it through `@pipelex/mthds-ui/form` and `@pipelex/mthds-ui/form/react` rather than importing it directly.** A second declaration is a second copy in the tree, and that bites silently: `FieldStringsProvider` and `FieldPresentationProvider` are React contexts, so with two copies a provider you mount above the panel does not resolve inside it — the panel reads the kernel's defaults while your app reads yours, with nothing in the console to say why. A host that declares nothing cannot produce a second copy, which is what makes the dependency arrangement safe where a nested copy would not be.

`make smoke-pack` asserts exactly that from a scratch consumer declaring only this package and React: the kernel arrives without being named, it is a dependency rather than a peer, there is **exactly one copy** in the tree, both React entries import it rather than inlining it, and `.`, `./graph` and `./static-graph` never reach it. The controls' styling is a separate step a host takes itself; see "Styling, and the trap in it" below.

The kernel declares `mthds` as a required peer of its own and re-exports its protocol types. A package manager with peer auto-installation supplies it; one that does not will ask for it. This library never imports it.

## Using it

```tsx
import { getPipeInputForm, getPipeIOContract } from "@pipelex/mthds-ui/form";
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

**The controls are the kernel's, and the host styles them.** They are Tailwind classes over shadcn semantic tokens, and neither React entry imports a stylesheet for them: the detail panel inside `./graph/react` renders the same controls through `StuffResultPanel`, so a host that only shows graphs needs this too. What a host loads depends on whether it runs Tailwind, and **a host loads one of the two, never both**.

### A host with Tailwind 4

Follow the kernel's own Tailwind 4 setup, [A host that runs Tailwind](https://github.com/Pipelex/mthds-form/blob/main/docs/theming.md#a-host-that-runs-tailwind-the-common-case), with one line replaced: where it writes an `@source` path into `node_modules`, import this package's `tailwind.css` instead.

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "@pipelex/mthds-ui/tailwind.css";

@theme inline {
  --color-background: var(--background);
  --color-foreground: var(--foreground);
  /* …the rest of the shadcn mapping: border, input, ring, the primary,
     secondary, destructive, muted, accent, popover and card pairs, and
     --radius-lg, -md and -sm. A shadcn/ui codebase already has all of it. */
}
```

`tailwind.css` holds nothing but two `@source` directives written relative to its own place in the installed package. Tailwind resolves an imported package stylesheet to its real path before reading them, so one of the two finds the copy of the kernel this package depends on whichever layout your package manager chose: pnpm's virtual store, npm hoisting the kernel, or npm nesting it under this package. You never write a path into `node_modules`, and you never declare the kernel yourself, which under pnpm used to be the only way such a path resolved.

The rest of the kernel's setup stays yours, because scanning finds class names and your theme is what compiles them. `tw-animate-css` supplies the utilities the select popover's and the tooltip's transitions use, and the `@theme inline` mapping is what gives `bg-background` or `border-input` a value: without it they compile to nothing, however well the scan found them. The package does not ship the mapping, because the mapping is your design system. Do not import `form-kernel.css` in this setup; your build already produces those utilities, and the prebuilt sheet would add a second preflight.

### A host without Tailwind

Import the prebuilt sheet once, from your entry:

```ts
import "@pipelex/mthds-ui/form-kernel.css";
```

It is the kernel's `styles.css` under a cascade layer named `mthds-form`, and it is a complete Tailwind build, so two things come with it. **The preflight applies to the whole page, not only to the controls:** every browser default you have not restated goes, so headings drop to body size, lists lose their markers, and paragraphs and the body lose their margins. A dedicated panel such as a webview expects exactly that; a page of ordinary content that embeds a graph should restate the defaults it wants to keep. **The layer is what lets your rules win:** layered rules lose to unlayered ones whatever the load order, so every declaration you make yourself beats the kernel's utilities and its preflight on a tie.

The tokens are yours either way. Every kernel utility reads its token with a fallback, so a page that defines none renders the kernel's light neutral palette; define them, as complete colours, to brand the controls or to make `.dark` do something.

### Hosts that cannot use either

A Tailwind 3 host, and a Tailwind 4 host that configures a prefix, are not supported. The kernel's classes are unprefixed Tailwind 4 class names: a Tailwind 3 build compiles the ones only Tailwind 4 knows to nothing, and a prefixed build generates none of them. Such a host would therefore depend on the prebuilt sheet, whose preflight must rank below the host's own base styles while its utilities must rank above them, and no single position in the cascade gives both.

### Why the package stopped injecting the sheet

Until v0.20.0 the host had two lanes, both its own: widen its Tailwind 3 `content` globs into `node_modules/@pipelex/mthds-form/dist`, or load the prebuilt sheet by hand. The first failed quietly and often. A content glob stops at the host's own source, and a host that forgot got a form that was _mostly_ styled, because most of the controls' classes are used elsewhere in a typical app; only the classes unique to the controls disappeared, and what you saw read like a broken design system rather than a missing line.

v0.20.0 made the sheet this package's job, and both React entries imported it raw. It arrived in the host's `<head>` after the host's own stylesheet the moment a graph mounted, and its bare `.hidden { display: none }` beat the host's `.sm\:inline`, blanking every `class="hidden sm:inline"` label in the host at every width. v0.21.0 wrapped the sheet in the `mthds-form` cascade layer, on the claim that layered rules lose to the host's unlayered ones and that nothing changes for a host without Tailwind. Both halves of that claim turned out to be false, and v0.25.0 stopped injecting the sheet altogether.

No position in the cascade could have fixed it, because a complete Tailwind build is two things with different needs. Its preflight must rank below the host's base styles, or it resets them. Its utilities must rank above the host's base, or the host's preflight strips them, and below the host's utilities, or they beat the host's responsive variants. An `@import … layer()` gives the whole sheet one position. A Tailwind 4 host keeps its theme, base and utilities in real cascade layers, named before the kernel's sheet arrives, so appended, `mthds-form` ranked above the host's `utilities`, and the kernel's bare `.w-full`, `.flex-col` and `.hidden` beat every responsive variant the host wrote. Named first, it ranked below the host's `base`, where Tailwind 4's preflight sets `padding: 0` and `border: 0 solid` on every element, so every kernel utility the host had not compiled itself lost its padding and border. The only Tailwind 4 arrangement that worked was to compile the kernel's classes in the host and rank the sheet lowest, at which point the sheet did nothing at all. And in a host without Tailwind, the preflight reset the browser defaults of the host's whole page, which is the same class of failure the layer was introduced to stop.

So the decision became who loads the sheet rather than where it goes. A host with Tailwind 4 compiles the kernel's classes and never loads it; a host without Tailwind loads it, knowing what the preflight does. `src/styles/__tests__/formKernelLayer.test.ts` fails if any shipped source file imports a kernel stylesheet again, and `make smoke-pack` compiles a minimal Tailwind 4 host against the packed tarball under npm and pnpm and requires every utility in the kernel's prebuilt sheet to appear in its output.

The **standalone bundle** is a host without Tailwind, and loads the sheet the way one does. It is a plain `readFileSync` concatenation with no module resolution, so it ships the resolved sheet listed in `scripts/standaloneCssFiles.mjs`, unlayered, ordered with the vendor base sheets so this library's own component CSS still has the last word. A self-contained HTML has no host stylesheet for it to lose a tie to, and no host page for its preflight to reset.

### The theme bridge, and the hook for overriding tokens

`theme` does double duty: it selects this library's palette for the chrome **and** toggles the kernel's `.dark` class on the same container, which is how the shadcn tokens behind the controls flip. One prop, both halves — a panel whose chrome and controls disagreed on the theme would look broken in a way no host could fix from outside.

The container carries a stable class name, **`mthds-run-panel`**, as a documented hook. Scope shadcn token overrides to it when you want the form to follow your design system rather than the defaults:

```css
.mthds-run-panel {
  --primary: hsl(142 71% 45%);
  --ring: hsl(142 71% 45%);
}
```

**Write each token as a complete colour, not as a bare HSL triplet.** Since kernel `0.8.0` the controls are a Tailwind 4 build, and a Tailwind 4 theme holds whole colours: the sheet emits `background-color: var(--primary)` where it used to emit `background-color: hsl(var(--primary))`. So `--primary: 142 71% 45%` no longer composes into anything — it computes to `background-color: 142 71% 45%`, which is not a colour. The rule is then **discarded rather than overridden**, and a discarded declaration is the quietest failure CSS has: the build is green, the token is defined and inspectable, and the control simply falls back to `transparent` or to the initial `canvastext`. Any complete colour works — `hsl(…)`, `oklch(…)`, `#6b21a8` — which is also why the bridge below became easy.

A full automatic bridge — mapping this library's `--surface-*` / `--text-*` values onto the shadcn tokens — is still **not built**, but the reason has shrunk. It used to need runtime hex→HSL conversion, because the triplet form could not accept a hex value at all; whole colours take one directly, so what remains is only the judgement call: it is not obvious the form should follow the graph canvas rather than the host app's design system. Ask for it if you want it.

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

`use-local` is a **tarball install, not a symlink**, and that is the whole point. The kernel ships React contexts, and a symlinked checkout is a second module identity for Vite to resolve, so a provider mounted above the panel would silently fail to resolve inside it. The tarball puts one real directory in `node_modules`. It is a snapshot, so **re-run `make use-local` after every kernel edit**; nothing watches.

Two details the targets handle for you. They clear Vite's pre-bundle cache, because `.storybook/main.ts` names the kernel in `optimizeDeps.include` and a local build usually carries the _same_ version string as the published one — the optimizer's hash would not change and Storybook would keep serving the stale copy. And they install with `--no-save`, so `package.json` is never rewritten. The kernel is declared once there, as an ordinary `dependency` at a registry range — a host installs it transitively and never names it, reaching the kernel's own helpers through `@pipelex/mthds-ui/form`. Moving that range is a reviewed change that belongs to the `/bump-mthds-form` skill, not a side effect of leaving dev mode.

A local kernel whose version falls outside the declared range (developing the next minor, say) installs fine, because `--no-save` puts it in `node_modules` without asking npm to reconcile it against the manifest. It is also the case where forgetting `make use-npm` is easiest to miss, so check what is actually installed before trusting a green run:

```bash
node -p "require('./node_modules/@pipelex/mthds-form/package.json').version"
```

## Where things live

```
src/styles/
  tailwind.css                  # @pipelex/mthds-ui/tailwind.css: the kernel's @source paths, for a Tailwind 4 host
  form-kernel.css               # @pipelex/mthds-ui/form-kernel.css: the kernel's sheet, layered, for a host without Tailwind
  __tests__/formKernelLayer.test.ts
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
