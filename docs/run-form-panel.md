# The run form panel

`RunPanel` renders a pipe's input form: the fields, the readiness verdict on the Run button, and the wire-ready payload a run receives. It ships from its own entry point, `@pipelex/mthds-ui/form/react`, over the form kernel `@pipelex/mthds-form`.

The dividing line, stated once, because everything below follows from it: **anything that decides what a field IS, or whether the form MAY run, comes from the kernel. Anything that decides where things sit on screen belongs to this library.** The panel never reads a `json_schema` to make a rendering decision and never sniffs a value's shape. That is what keeps a change to the kernel's derivation invisible here — when the kernel swaps its heuristics for a server-derived descriptor, nothing in this repo moves.

## Installing

The kernel is an **optional peer dependency**. Graph-only consumers install nothing extra and nothing changes for them; a consumer that wants the form installs it alongside:

```bash
npm install @pipelex/mthds-ui @pipelex/mthds-form
```

It is a peer, not a dependency, for a reason that bites silently if you get it wrong: `FieldStringsProvider` and `FieldPresentationProvider` are React contexts. If this library carried its own nested copy of the kernel, a provider you mount above the panel would not resolve inside it — the panel would read the kernel's defaults while your app read yours, with nothing in the console to say why. One instance, shared, is the only arrangement that works.

The same reasoning is why the panel lives behind `./form/react` and never leaks into `./graph/react`. An eslint rule (`no-restricted-imports` in `eslint.config.mjs`) confines every `@pipelex/mthds-form` import to `src/form/**`, and `make smoke-pack` checks the built package from a consumer that deliberately has no kernel installed.

## Using it

```tsx
import { getPipeIOContract } from "@pipelex/mthds-form";
import { RunPanel } from "@pipelex/mthds-ui/form/react";
import "@pipelex/mthds-ui/form/react/RunPanel.css";

function MethodPanel({ contracts, domain, pipeCode, onExecute }) {
  const [values, setValues] = useState({});
  // Note the argument order — the kernel's README currently shows it wrong.
  const contract = getPipeIOContract(contracts, domain, pipeCode);
  if (!contract) return null;

  return (
    <RunPanel
      contract={contract}
      values={values}
      onValuesChange={setValues}
      onRun={onExecute}
      title={pipeCode}
      theme="dark"
    />
  );
}
```

`contracts` is the `pipe_io_contracts` map from the same `/validate` call that produced your graph spec. Hosts that can actually run a method already hold it, so feeding the panel costs one prop.

### Props

| Prop                        | Required | What it does                                                                                                               |
| --------------------------- | -------- | -------------------------------------------------------------------------------------------------------------------------- |
| `contract`                  | yes      | The pipe's `PipeIOContract` — the kernel's type. See "Why not a GraphSpec" below.                                          |
| `values` / `onValuesChange` | yes      | Fully controlled field values. The host owns the state; the panel never holds a copy.                                      |
| `onRun`                     | yes      | Fires **only after the kernel's run gate passes**, with the `{concept, content}` payload a run expects.                    |
| `running`                   | no       | A run is in flight: the fields and the button go inert.                                                                    |
| `env`                       | no       | Ambient `FieldEnv` passed to every control. The host's value wins **per key**; the panel fills in what you left undefined. |
| `uploadFile`                | no       | Stores a dropped file and returns its URL. See "Files" below.                                                              |
| `title`                     | no       | Panel header. There is no default — the host names the pipe.                                                               |
| `theme`                     | no       | `"dark"` or `"light"`. Drives both this library's palette and the kernel's `.dark` class. Defaults to `"light"`.           |
| `translate`                 | no       | Renders validation messages in your language. English by default.                                                          |
| `className`                 | no       | Appended to the container's class list.                                                                                    |

### What the host still owns

This library renders; it never executes. `onRun` hands you a payload and stops there — no API client, no upload, no storage-URL resolution. That is deliberate, and it is the same boundary the kernel draws with its own `FieldEnv`.

**Files.** The panel does the bookkeeping and you do the transfer: supply `uploadFile(file, fieldId)`, and the panel marks the field busy while it runs and writes `{ url, filename }` back at the field's dotted path when it resolves. A rejected upload is swallowed — you own how a failure is announced, because you own the transport — and the field simply stays empty. If you would rather own the whole loop, pass `env.onDropFile` and `env.uploadingIds` instead; yours win.

Two consequences of an upload being slow, both handled here so a host does not have to think about them.

**Run is disabled while any upload the panel knows about is in flight**, including uploads you report through `env.uploadingIds`. Readiness alone is not enough, because a non-gating file input — an optional one, or a plural one, since a list never gates — never counts toward readiness at all: without this, Run stays live right through such a field's upload and the method runs with the file simply missing.

**The write-back merges into the latest values, not the ones captured when the drop happened**, so edits made to other fields while an upload was running survive it.

An upload is also tied to the `contract` it started under, and a result that resolves after you have switched to a different pipe is discarded — as is its bookkeeping. This matters more than it sounds: two pipes of the same method routinely share an input name — `recruitment.cv_screening` and `recruitment.extract_cv` both take a required `cv` — so without this the file chosen for one would land in the other looking like a deliberate answer, gating satisfied, ready to send. The bookkeeping half is the same problem one step later: switching pipes releases the gate and re-opens the dropzone, so the user can start a second upload on that shared field id, and a departed upload finishing must not un-mark the one that replaced it. The consequence for a host is that **`contract` is referentially significant**: pass the object your lookup returns rather than rebuilding it each render, or uploads in flight will be thrown away. (A host rebuilding it each render is already rebuilding every field, since the field list memoizes on the same reference.)

**Already-stored files.** Pass `env.resolveUrl` so a `pipelex-storage://` URI can be previewed.

## Two things about the gate worth knowing

**The gate does not catch an empty required text input.** It reaches ajv as `{ text: "" }`, which is a perfectly valid string. `computeReadiness` is what notices, which is why the Run button gates on readiness and the gate is the last line of defence against a _malformed_ payload rather than the thing that tells you the form is unfinished. Both run; they answer different questions.

**A verdict can be invalid with nothing to name.** `validateRunInputs` reports `missingInputs` by variable name when it can, but a wrong value shape or a nested mismatch legitimately produces an invalid verdict with an empty `missingInputs`. The panel falls back to describing the ajv errors, so a blocked run is never undiagnosable. If you inject `translate`, that fallback is what it renders.

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

**The controls are the kernel's, and bringing in their styling is your lane.** They are Tailwind classes over shadcn semantic tokens, and there are exactly two ways to serve them. Pick one — they are mutually exclusive:

1. **You run Tailwind.** Add the kernel's bundle to your `content` globs so its classes are not purged:
   ```js
   content: [..., "./node_modules/@pipelex/mthds-form/dist/**/*.js"],
   ```
2. **You do not run Tailwind.** Load the kernel's prebuilt pair, which carries Tailwind's preflight:
   ```ts
   import "@pipelex/mthds-form/theme.css";
   import "@pipelex/mthds-form/styles.css";
   ```

**The trap, inherited verbatim in spirit from `pipelex-app/docs/form-kernel-package.md`:** a Tailwind host that forgets the content glob gets a form that is _mostly_ styled. Most of the controls' classes are used elsewhere in a typical app and survive the purge coincidentally; only the ones unique to the controls disappear — the input focus ring and border, the placeholder colour, the prose textarea's minimum height, the input background tint, the dropzone's drag-active state. What you see reads like someone broke the design system, not like a missing glob. If you suspect it, build the stylesheet with and without the entry and diff which selectors are present; do not eyeball the form.

Do not do both. `styles.css` carries preflight, so loading it inside a host that compiles the classes itself double-loads the reset.

This library deliberately imports neither into its own CSS. Storybook here takes lane 2, which makes these stories the first place that lane is exercised end to end — see `.storybook/preview.ts`.

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

## Fixtures

The contracts the stories render are **generated**, never hand-written:

```bash
make fixtures-contracts        # all bundles, offline, no inference
make fixtures-contracts ONLY=pipeline_09
```

This is not ceremony. A hand-authored contract gets the kernel's concept taxonomy subtly wrong — `native.Date` renders as _prose_ and wraps as `{ text }`, which is documented kernel drift and which nobody guesses — so a form tested against invented contracts is tested against inputs no method produces.

Because a contract is a projection of what a pipe **declares**, it needs no execution, which is why the pass is its own fast offline one and why the form fixtures rebuild without every bundle in the corpus being currently runnable. No pipelex CLI emits `pipe_io_contracts` yet, so `scripts/dump_pipe_io_contracts.py` calls the canonical builder through the pipelex venv; it is retired the moment the CLI can do it (`../wip/inbox/2026-08-23-pipelex-expose-pipe-io-contracts-in-agent-cli.md`).

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
