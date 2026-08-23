"use client";

import * as React from "react";
import {
  computeReadiness,
  fieldsForContract,
  isFilled,
  setValueAtPath,
  type PipeIOContract,
  type RunField,
  type Translate,
} from "@pipelex/mthds-form";
import { FieldRenderer, OptionalToggle, type FieldEnv } from "@pipelex/mthds-form/react";
import { getPaletteForTheme } from "@graph/graphConfig";
import { GRAPH_THEME, type GraphTheme } from "@graph/types";
import { runSubmitGate } from "@form/runGate";
import "./RunPanel.css";

/** What a host's upload returns: the stored URL, and optionally a display name. */
export interface UploadedFile {
  url: string;
  filename?: string;
}

export interface RunPanelProps {
  /**
   * The pipe's IO contract — the kernel's type, supplied by the host.
   *
   * Hosts that can actually run a method already hold `pipe_io_contracts` from
   * the same `/validate` call that produced their graph spec; look an entry up
   * with the kernel's `getPipeIOContract(contracts, domain, pipeCode)`. The
   * panel deliberately does NOT accept a `GraphSpec` and derive a contract from
   * it — deriving field meaning locally is precisely what this component exists
   * not to do (design Decision A).
   */
  contract: PipeIOContract;
  /** Fully controlled field values, host-owned — the kernel's philosophy. */
  values: Record<string, unknown>;
  onValuesChange: (values: Record<string, unknown>) => void;
  /** Fires only after the kernel's run gate passes, with the wire-ready payload. */
  onRun: (apiInputs: Record<string, unknown>) => void;
  /** A run is in flight: the fields and the Run button go inert. */
  running?: boolean;
  /**
   * Ambient field state, passed to every control. The host's value wins PER
   * KEY; the panel fills in whatever the host left undefined — `disabled` from
   * `running`, and `onDropFile`/`uploadingIds` from its own upload tracking
   * when `uploadFile` is supplied.
   */
  env?: FieldEnv;
  /**
   * Stores a dropped file and returns its URL. The host performs the upload —
   * this library never touches an API client — while the panel owns the
   * bookkeeping around it: marking the field busy and writing the result back
   * at the field's dotted path.
   */
  uploadFile?: (file: File, fieldId: string) => Promise<UploadedFile>;
  /** Panel header. The host names the pipe; there is no default heading. */
  title?: string;
  /**
   * The resolved theme, which drives the kernel's `.dark` class on the panel
   * container alongside this library's own palette variables. Defaults to
   * `light`. Pair it with `GraphViewer`'s `onThemeChange`, whose second
   * argument is exactly this resolved value.
   */
  theme?: GraphTheme;
  /** Renders validation errors in the host's language. English by default. */
  translate?: Translate;
  /** Appended to the panel container's class list. */
  className?: string;
}

const EMPTY_IDS: ReadonlySet<string> = new Set<string>();

/**
 * A pipe's input form: fields, readiness, and the run gate, composed.
 *
 * Every question of meaning is the form kernel's — `fieldsForContract` decides
 * what each input IS, `computeReadiness` decides whether the form MAY run, and
 * `runSubmitGate` (over the kernel's four steps) decides what goes on the wire.
 * What lives here is layout: which fields are visible, where the toggle and the
 * button sit, and how a rejected verdict is shown. The panel never reads
 * `json_schema` to make a rendering decision and never sniffs a value's shape
 * (design Decision C) — which is what keeps a change to the kernel's derivation
 * invisible to this repo.
 */
export function RunPanel({
  contract,
  values,
  onValuesChange,
  onRun,
  running = false,
  env,
  uploadFile,
  title,
  theme = GRAPH_THEME.LIGHT,
  translate,
  className,
}: RunPanelProps) {
  const [showOptional, setShowOptional] = React.useState(false);
  const [uploadingIds, setUploadingIds] = React.useState<ReadonlySet<string>>(EMPTY_IDS);
  const [submitError, setSubmitError] = React.useState<string | null>(null);
  const readinessHintId = React.useId();

  const fields = React.useMemo(() => fieldsForContract(contract), [contract]);
  const readiness = React.useMemo(() => computeReadiness(fields, values), [fields, values]);

  const commitValues = React.useCallback(
    (next: Record<string, unknown>) => {
      // A summary describes the values that produced it; the moment they move
      // it is stale, and a stale complaint about a field just corrected is
      // worse than none.
      setSubmitError(null);
      onValuesChange(next);
    },
    [onValuesChange],
  );

  // An upload resolves long after the render that started it, so the write-back
  // must not target the values THAT render captured — the user may well have
  // typed elsewhere while waiting. This mirror holds the latest ones. Only the
  // async continuation reads it; every synchronous path stays on the prop,
  // which is correct there because it runs inside the render that captured it.
  // Layout, not passive, for the reason spelled out on the contract marker
  // below: a mirror that lags the commit is read by continuations landing in
  // exactly that lag, and here the cost is the host's newer edits overwritten.
  const valuesRef = React.useRef(values);
  React.useLayoutEffect(() => {
    valuesRef.current = values;
  }, [values]);

  // Switching pipes makes an upload started under the old one irrelevant — and
  // worse than irrelevant when both pipes declare the same input name, which
  // happens within a single method: `recruitment.cv_screening` and
  // `recruitment.extract_cv` both take a required `cv` document. A file chosen
  // for one would land in the other looking like a deliberate answer, gating
  // satisfied, ready to run. So a drop remembers the generation it happened
  // under, and a result arriving under a later one is dropped. This makes
  // `contract` referentially significant — a host that rebuilds it every render
  // loses its uploads (and is already rebuilding every field, since `fields`
  // memoizes on it).
  //
  // The marker COUNTS rather than naming the contract, because identity answers
  // a subtly different question. A host can leave pipe A and come back to the
  // very same contract object while A's upload is still in flight, and an
  // identity check then says "same pipe, accept it" — ABA, and it is not the
  // same form: switching away emptied `uploadingIds`, so that upload stopped
  // gating Run and its dropzone re-opened. Accepting it lands a file in a form
  // that never marked it — Run was live throughout, and for a non-gating input
  // the run may already have gone out without it — and, if the user re-dropped
  // on the way back, overwrites the fresh result while un-marking an upload
  // still in progress. Counting makes the predicate "has the form moved on
  // since this drop", which is what the guard always meant.
  //
  // A LAYOUT effect, deliberately. The marker answers "which form is on
  // screen", and it has to answer that as of the last COMMIT. A passive effect
  // answers later: React schedules those on a task, while an upload settling is
  // a promise continuation — a microtask, which runs first. In that window the
  // switched form is already rendered and the marker still counts the pipe the
  // user left, so the guard compares the departed generation against itself and
  // lets through precisely the write it exists to reject. Bumping during render
  // would close the window too, and is worse: a concurrent render React
  // abandons would advance past a contract that never commits, and an upload
  // belonging to the pipe still on screen would be thrown away instead. Layout
  // effects run inside the commit, and only for renders that commit.
  //
  // The bump lives in the CLEANUP, which is the one place BOTH ways of leaving a
  // form pass through. Changing `contract` is only one of them: a host that
  // writes `<RunPanel key={pipeRef} …>` — the ordinary React idiom for "reset
  // this child when the entity changes" — never changes the prop at all, it
  // unmounts this instance and mounts another. The effect body would then never
  // re-run, the marker would still equal the departed upload's `startedAt`, and
  // that upload's continuation would call `onValuesChange`, which is the HOST's
  // setter and very much still alive. The abandoned file would land in the
  // replacement panel's `cv` exactly as if it had been chosen there. Bumping on
  // cleanup makes the predicate mean what it says — this form instance has
  // stopped being the one on screen — however it stopped.
  const generationRef = React.useRef(0);
  React.useLayoutEffect(() => {
    // Whatever was in flight belonged to the previous pipe; it must not go on
    // gating this form's Run button until it happens to settle.
    setUploadingIds(EMPTY_IDS);
    // Nor may a complaint about the previous pipe's inputs stand over this
    // pipe's form: it names fields that are no longer on screen.
    setSubmitError(null);
    return () => {
      generationRef.current += 1;
    };
  }, [contract]);

  const handleDropFile = React.useCallback(
    (id: string, file: File) => {
      if (!uploadFile) return;
      const startedAt = generationRef.current;
      setUploadingIds((previous) => new Set(previous).add(id));
      // Called through an async wrapper rather than directly. `uploadFile` is
      // the HOST's function and is typed as a plain function returning a
      // promise — nothing obliges it to be `async`. One that validates before
      // it starts the request (no API key configured, a file over the size
      // limit, a mime type it will not take) throws SYNCHRONOUSLY, and a
      // synchronous throw happens before there is a promise to hang `.catch()`
      // and `.finally()` on. The id marked one line above would then stay
      // marked for good: `uploading` disables the dropzone, so the field cannot
      // even be retried, and Run stays gated until the user leaves the form
      // entirely. The wrapper turns that throw into the rejection this chain
      // already cleans up, which makes the SAME host logic behave the same way
      // whether it was written `async` or not — the only difference between
      // those two spellings being the keyword.
      void (async () => await uploadFile(file, id))()
        .then(
          (uploaded) => {
            if (generationRef.current !== startedAt) return;
            const next = setValueAtPath(valuesRef.current, id.split("."), {
              url: uploaded.url,
              filename: uploaded.filename ?? file.name,
            });
            // Advance the mirror here rather than waiting for the effect. Two
            // uploads finishing in the same React batch both run before any
            // re-render, so both would otherwise read the same snapshot and the
            // second write would drop the first — a pipe with two file inputs is
            // ordinary (`candidate_screening.screen_candidate` takes a `cv` and a
            // `job_offer`), and the loss is silent: both fields look settled
            // while one value is gone. The effect still owns syncing FROM the
            // host, so the mirror converges on whatever the host actually kept.
            valuesRef.current = next;
            commitValues(next);
          },
          () => {
            // The host owns how a failed upload is announced (it owns the
            // transport). Swallowing it here keeps a rejected promise from
            // becoming an unhandled rejection; the field simply stays empty.
            //
            // This is `.then`'s SECOND ARGUMENT rather than a `.catch()` link,
            // and the difference is the whole point: a `.catch()` chained after
            // the handler above also catches whatever that handler throws, and
            // the handler dereferences a value the host produced. `uploadFile`
            // is typed `Promise<UploadedFile>`, but a type is not a runtime
            // guarantee — a host branch that forgets its `return`, or unwraps a
            // JSON response one level too few, resolves to `undefined`, and
            // `uploaded.url` then throws. Swallowed, that is the one failure in
            // this whole lifecycle with NO diagnostic surface anywhere: the
            // spinner clears, the field reads empty, nothing is logged, and
            // re-dropping repeats it forever. As the second argument this
            // handler covers only the upload's own rejection, which is all it
            // ever claimed to; a write-back bug stays an unhandled rejection,
            // where the host's error reporting can see it.
          },
        )
        .finally(() => {
          // The same generation check as the write-back, for a sharper reason.
          // Switching contracts already emptied this set, and the very same id
          // may since have been re-added by a NEW upload under the new
          // generation — nothing exotic, since that is what sharing the `cv`
          // input name means, and a host returning to the pipe it left reaches
          // it with no rename at all. Deleting it here would un-mark an upload
          // that is still running: its dropzone re-enables mid-flight, its
          // progress indicator vanishes, and the Run gate lets go of it.
          if (generationRef.current !== startedAt) return;
          setUploadingIds((previous) => {
            const next = new Set(previous);
            next.delete(id);
            return next;
          });
        });
    },
    // `contract` is no longer a dependency: the generation is read off the ref
    // at drop time, so this callback does not need rebuilding per pipe.
    [uploadFile, commitValues],
  );

  const fieldEnv = React.useMemo<FieldEnv>(
    () => ({
      ...env,
      disabled: env?.disabled ?? running,
      onDropFile: env?.onDropFile ?? (uploadFile ? handleDropFile : undefined),
      // The UNION, not the host's set winning outright: `onDropFile` and
      // `uploadingIds` default independently per key, so a host may hand us
      // `uploadFile` (leaving the panel to own the drop, and to mark the field
      // in its own set) while also passing a tracker of its own. Letting the
      // host's set replace ours would hide an upload the panel itself started,
      // and Run would stay live through it. A host that owns the whole loop
      // supplies `onDropFile` too, so our set is empty and the union is exactly
      // its set — "yours win" still holds where that clause applies.
      uploadingIds: new Set([...(env?.uploadingIds ?? EMPTY_IDS), ...uploadingIds]),
    }),
    [env, running, uploadFile, handleDropFile, uploadingIds],
  );

  // Readiness alone would let a run go out while a file is still uploading: a
  // non-gating file input (optional, or plural — `mustBeFilled` excludes lists)
  // never counts toward readiness, so Run stays live through its upload and the
  // method would run with the file simply absent. Read off `fieldEnv` rather
  // than the raw state, so a host driving its own loop through
  // `env.uploadingIds` gets the same gate.
  const uploading = (fieldEnv.uploadingIds?.size ?? 0) > 0;
  const notReady = readiness.missing.length > 0;

  // ONE expression, read by the button and by the submit path, because they are
  // the same question asked twice and any gap between them is reachable: the
  // panel puts a real `<form>` in the host's DOM under a class name the docs
  // offer as a hook, and `form.requestSubmit()` ignores the submitter entirely,
  // so a disabled button stops nothing there. (The keyboard it does stop: Run is
  // this form's only submit button — every control the kernel renders carries
  // `type="button"` — hence the default button, and implicit submission on a
  // disabled default button does nothing. Measured, not assumed.)
  //
  // Each term has to be here on its own merit, and none is redundant with the
  // kernel gate that runs afterwards. `uploading`: a non-gating file input
  // (optional, or plural — `mustBeFilled` excludes lists) never counts toward
  // readiness, so without this the method runs with the file simply absent.
  // `notReady`: an empty REQUIRED text input reaches ajv as `{ text: "" }`, a
  // perfectly valid string, so the gate passes it and only readiness notices —
  // that is pinned in `runGate.test.ts` and is exactly why the button gates on
  // readiness at all. `running`: a second run started over the first is a
  // duplicate execution, which nothing downstream would undo.
  const blocked = running || notReady || uploading;

  // Optional inputs that are still empty stay folded, so the form opens at its
  // simplest shape and grows on demand. Required or already-filled always show.
  const isFoldable = React.useCallback(
    (field: RunField) => !field.required && !isFilled(values[field.name]),
    [values],
  );
  const foldableCount = fields.filter(isFoldable).length;
  const visibleFields = showOptional ? fields : fields.filter((field) => !isFoldable(field));

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    // The submit PATH owns the gate, not the button's `disabled` attribute —
    // see `blocked` above for why each term is there and why none is covered by
    // the kernel gate that runs next.
    if (blocked) return;
    const outcome = runSubmitGate(contract, fields, values, translate);
    if (!outcome.ok) {
      setSubmitError(outcome.summary);
      return;
    }
    setSubmitError(null);
    onRun(outcome.apiInputs);
  };

  const paletteStyle = React.useMemo(
    () => getPaletteForTheme(theme) as React.CSSProperties,
    [theme],
  );

  return (
    <form
      className={["mthds-run-panel", theme === GRAPH_THEME.DARK && "dark", className]
        .filter(Boolean)
        .join(" ")}
      style={paletteStyle}
      onSubmit={handleSubmit}
    >
      {title && <h2 className="mthds-run-panel-title">{title}</h2>}

      {fields.length > 0 ? (
        <div className="mthds-run-panel-fields">
          {visibleFields.map((field) => (
            <FieldRenderer
              key={field.name}
              field={field}
              value={values[field.name]}
              onChange={(value) => commitValues({ ...values, [field.name]: value })}
              id={field.name}
              env={fieldEnv}
            />
          ))}
          {foldableCount > 0 && (
            <OptionalToggle
              count={foldableCount}
              expanded={showOptional}
              onToggle={() => setShowOptional((expanded) => !expanded)}
              noun="input"
            />
          )}
        </div>
      ) : (
        <p className="mthds-run-panel-empty">This pipe takes no inputs.</p>
      )}

      {submitError && (
        <p className="mthds-run-panel-error" role="alert">
          {submitError}
        </p>
      )}

      <div className="mthds-run-panel-footer">
        {/*
          The readiness line is the only thing on screen that says WHY Run is
          disabled, so it has to be reachable by the people who cannot see it
          sitting next to the button — and a disabled button is out of the tab
          order, so they will not arrive at it by walking the controls either.
          `aria-describedby` is the association that makes a screen reader read
          the reason with the button instead of announcing a bare dimmed "Run".
          The id comes from `useId` because a host may put two panels on one
          page, and a hardcoded one would make the second panel describe the
          first panel's button.
        */}
        <button
          type="submit"
          className="mthds-run-panel-run"
          disabled={blocked}
          aria-describedby={notReady ? readinessHintId : undefined}
        >
          {running ? "Running…" : "Run"}
        </button>
        {notReady && (
          <span id={readinessHintId} className="mthds-run-panel-readiness">
            {`${readiness.ready} of ${readiness.total} ready — still needed: ${readiness.missing.join(", ")}`}
          </span>
        )}
      </div>
    </form>
  );
}
