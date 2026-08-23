# Deferred: what a second cold review found after the bots and the first sweep went clean

**Raised:** 2026-08-23, by an independent `/review` sweep over the K2 branch run with no inherited context, after both PR bots had converged and the first independent sweep had already been absorbed. Every item below was re-verified against the tree before being written down, and none was fixed — the branch was finished and being reviewed rather than edited, so these are handed over rather than applied.

**Line references are anchored at `710ce7d`.** Where a line moves, the quoted text beside it is what to search for.

---

## 1. The panel's `<form>` has no `noValidate`, so the browser can veto a submit the panel's own gate would allow

`src/form/react/RunPanel.tsx:348-353`

```tsx
    <form
      className={["mthds-run-panel", theme === GRAPH_THEME.DARK && "dark", className]
        .filter(Boolean)
        .join(" ")}
      style={paletteStyle}
      onSubmit={handleSubmit}
```

The panel's stated design is that **the submit path owns the gate** — `handleSubmit` re-decides `blocked` (`RunPanel.tsx:332`) rather than trusting the button's `disabled` attribute, and `docs/run-form-panel.md:70` sells that to hosts: "run the form from your own button if you like, and you still cannot start a duplicate run, send a blank required text input, or send without a file that is on its way."

There is a gate above all of those that the panel does not know about. A real `<form>` without `noValidate` runs **interactive constraint validation** before the `submit` event fires, and the kernel's `NumberField` renders a natively constrained control:

```js
// node_modules/@pipelex/mthds-form/dist/react/index.js — NumberField
const step = field.integer ? 1 : 0.1;
...
{ id, type: "number", ..., step, min: field.min, max: field.max, ... }
```

So for a non-integer number field, `step` is `0.1`. A value with more than one decimal place is a `stepMismatch`, and the browser refuses the submission: no `submit` event, no `handleSubmit`, no `runSubmitGate`, no `onRun`, and no panel error summary. Only a native bubble, whose wording — "the two nearest valid values are 87.2 and 87.3" — is **wrong about the domain**: `87.25` is a perfectly ordinary `native.Number`, ajv accepts it, and the runtime would too. The browser is rejecting a value the method declares valid.

Measured in Chromium (playwright, a bare page with `<form><input type="number" step="0.1"><button type="submit">`), value `3.14`:

```
{ "invalid": { "stepMismatch": true, "valid": false },
  "afterClick": 0, "afterRequestSubmit": 0, "afterValidClick": 1 }
```

`afterClick` and `afterRequestSubmit` are how many times the submit handler ran. Both zero. `form.requestSubmit()` — the exact path `docs/run-form-panel.md:70` blesses — is blocked identically, because it runs interactive validation too.

**This is reachable from a contract this repo already renders in a story.** `recruitment.MatchScore.score` is `{"description": "Match score 0-100", "title": "Score", "type": "number"}` (`data/pipelines/pipeline_09/pipe_io_contracts.json`), which the kernel derives as `{ kind: "number", integer: false }`. That contract is `COMPOSE_REPORT` in `src/form/react/__stories__/RunPanel.stories.tsx:44`, rendered by `ImageAndStructured` and `UploadKeepsConcurrentEdits`. `text_analysis.Sentiment.confidence` (`data/pipelines/pipeline_05/`) is the same shape, and a confidence of `0.85` trips it.

`min`/`max` are the same story one step over: `NumberField` clamps on the stepper buttons but not on typed input, so a typed out-of-range value fails `rangeUnderflow`/`rangeOverflow` and takes the same silent exit.

**Fix:** `noValidate` on the `<form>`. It is the standard attribute for a React form that validates itself, it is one token, and it restores the invariant the rest of the file works hard to hold — that every gate is re-decided on the submit path. Worth a story on a number-bearing contract at the same time; there is none today, which is why nothing went red.

**Checked and rejected while looking at this:** the kernel's `required` prop is NOT a native `required` attribute — `FieldShell` only reads it to decide whether to show the "optional" badge, and no control forwards it to an input. So required-but-empty is not a native-validation vector, and the readiness gate remains the only thing deciding it.

---

## 2. Field control ids are unscoped, so two panels on one page emit duplicate DOM ids

`src/form/react/RunPanel.tsx:359-366`

```tsx
            <FieldRenderer
              key={field.name}
              field={field}
              value={values[field.name]}
              onChange={(value) => commitValues({ ...values, [field.name]: value })}
              id={field.name}
              env={fieldEnv}
```

The kernel puts that string straight into the document: `FieldShell` renders `<label htmlFor={id}>` and every control sets `id` on its element. So a panel for `draft_notice` always emits an element with `id="subject"`, whatever else is on the page.

The panel already recognises this hazard one screen down and solves it there. `RunPanel.tsx:103` uses `React.useId()` for the readiness hint, and the comment at `:396-398` explains why: "a host may put two panels on one page, and a hardcoded one would make the second panel describe the first panel's button." The field ids are exactly that case, left hardcoded.

The repo's own story ships the collision: `RunPanel.stories.tsx`'s `RequestSubmitRespectsEveryGate` mounts three panels on the same `NOTICE` contract, so the page carries three controls with `id="subject"` and three labels pointing at it. The story does not notice because it reaches for the forms with `canvasElement.querySelector`, which silently takes the first match; `getByLabelText` would have thrown on the duplicate.

**`docs/run-form-panel.md:72` currently over-promises about this.** Its closing clause — "the id is generated with `useId`, so it is already safe to mount several panels on one page" — is true of the `aria-describedby` association it is describing and false as the general statement it reads like. The sentence should be scoped, whether or not the ids are fixed.

**Why the fix is not one line.** The id is doing three jobs at once: the DOM id, the dotted value path that `setValueAtPath(valuesRef.current, id.split("."), …)` writes to (`RunPanel.tsx:213`), and the `uploadingIds` key. Prefixing it with a `useId` would fix the DOM and break the other two unless the prefix is stripped before both. The clean shape is to separate the DOM id from the value path — which is partly a kernel question, since `FieldRenderer` is what composes the nested ones.

---

## 3. A list item's upload id is its INDEX, so removing a row mid-upload lands the file on the wrong row

The kernel composes a list row's id positionally:

```js
// node_modules/@pipelex/mthds-form/dist/react/index.js — ListField
id: `${id}.${index}`,
```

and its remove button is disabled only by `env?.disabled`, which `RunPanel.tsx:274` sets from `running` — never from `uploading`. So a row can be deleted while its own upload is in flight, and every row after it shifts down one index. The continuation at `RunPanel.tsx:212-213` then passes its generation check (the contract never changed) and writes the arriving file at the path that index now names, which belongs to a different row.

The shorter-array case is worse: `setValueAtPath` assigns into the array by index, so a write-back past the new end produces a hole, which survives `rjsfDataFromRunValues`'s `map` and reaches ajv as `'DocumentContent' must be object` — an error naming nothing the user can act on. The `uploadingIds` entry is positional too, so after the removal the row that shifted into that index shows an upload indicator and a disabled dropzone for an upload never started on it.

**Reachable from the corpus, not from any story.** `cv_matching.screen_cvs.cvs` (`data/pipelines/pipeline_26/`) and `cv_batch_screening.batch_analyze_cvs_for_job_offer.cvs` (`data/pipelines/pipeline_28/`) are both `native.Document` arrays. No story imports either, and every upload story in the branch uses a top-level single-file input — which is why every round of this review missed it.

**Where the fix belongs.** Stable per-item identity is the kernel's to give; keying an upload to an array position is the root cause and it is composed in `ListField`. What this repo can do without waiting: disable a row's remove control while that row is uploading, and drop `uploadingIds` entries whose list index no longer exists. File the identity half against `mthds-form`.

---

## 4. `throwingUploadSpy` is never reset, so its story's synchronisation point can be vacuous

`src/form/react/__stories__/RunPanel.stories.tsx` — `UploadFileThrowsSynchronously`'s play function opens with

```ts
await waitFor(() => expect(throwingUploadSpy).toHaveBeenCalled());
```

and the comment above it says that wait is load-bearing: react-dropzone hands the file over in a promise continuation, so the negative assertion immediately after it ("`Uploading` is not in the document") passes by looking too early unless something establishes the precondition first. That is the lesson `TODOS.md` records under "Things a fresh session would otherwise rediscover the hard way".

The spy is module-level and never cleared. Its three siblings are — `RequestSubmitRespectsEveryGate`'s play begins `for (const spy of [uploadingGateSpy, notReadyGateSpy, runningGateSpy]) spy.mockClear();`. On any second execution of this play function against the same module instance — re-running the interaction in the Storybook UI, HMR, watch mode — `toHaveBeenCalled()` is already satisfied from the previous run, `waitFor` returns on its first synchronous check, and the negative assertion is back to passing against a form that is about to wedge. That is precisely the regression the story exists to catch.

A single pass of the vitest storybook project gets a fresh module per file, so this does not affect CI today. It affects the surface where a human actually looks at the story.

**Fix:** `throwingUploadSpy.mockClear()` at the top of the play function, the same line its siblings already have.

---

## 5. The sibling generator note's line references have drifted again

`wip/adopt-form/deferred-fixture-generator-hygiene.md` was re-anchored once, in `108d8a4`. Two commits since then inserted lines into `scripts/generate-fixtures.mjs` above most of what it cites, and neither re-anchored it. Against `710ce7d`:

| Cited                                                        | Actual                                                         |
| ------------------------------------------------------------ | -------------------------------------------------------------- |
| `:9` → `generate-fixtures.mjs:296`                           | 296 — still correct                                            |
| `:9` → `:694` (the second `JSON.parse`)                      | 711                                                            |
| `:19` → `:201-204` (`die`)                                   | 201-204 — still correct                                        |
| `:27` → `:659-677` (the loop's `try`/`finally`)              | 675-694; the cited range does not contain the `finally` at all |
| `:27` → "line 672" (`writePipeIoContracts` inside the `try`) | 689                                                            |
| `:46` → `:611`                                               | 624                                                            |
| `:47` → `:816`                                               | 833                                                            |

The note's own code block quotes those two call sites **with their line-number prefixes baked into the text**, which is what makes the drift silent — there is nothing to grep for and no way to notice from reading. Worth re-anchoring, and worth quoting the call sites without the prefixes so the next drift is harmless.

---

## Hypotheses checked and rejected — recorded so nobody re-runs them

- **Native `required` on the kernel's controls.** `required` is a `FieldShell` prop that only chooses whether the "optional" badge renders. No control forwards it to an input, so an empty required field is not a native-validation vector. (Finding 1 is about `step`/`min`/`max` on `NumberField` alone.)
- **`defaultValidationTranslate` missing a key.** Every `t(...)` call in the kernel's `describeValidationError` and `labelOf` was enumerated against the `ValidationMessageKey` union; `VALIDATION_STRINGS` in `src/form/runGate.ts` covers all of them at the pinned `0.2.0`, so `template` cannot be `undefined` and `.replace` cannot throw. The forward-compatibility variant is already deferred in `deferred-review-residues.md` and is not re-raised here.
- **`describeValidationError` argument order.** `summarizeVerdict` passes `(error, t, preparedData)`, which matches the kernel signature — and `preparedData` is the correct third argument specifically because `error.property` is built from ajv's `instancePath` over the prepared data.
- **The flat top-level write-back disagreeing with `setValueAtPath`.** `ObjectField` and `ListField` recompose the whole top-level value before calling up, so `{ ...values, [field.name]: value }` is the right granularity for `onChange`; the dotted path is used only by the upload continuation, and it is correct for every nesting shape except a list index (finding 3).
- **Packaging.** The `external` regex matches the specifier `RunPanel.tsx` actually writes, the `onSuccess` copy pair is present, `src/form` is deliberately excluded from the standalone CSS manifest with the reasoning encoded in its test, and `make smoke-pack` passes end to end from a consumer with no kernel installed.
