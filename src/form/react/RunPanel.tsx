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
  const valuesRef = React.useRef(values);
  React.useEffect(() => {
    valuesRef.current = values;
  }, [values]);

  const handleDropFile = React.useCallback(
    (id: string, file: File) => {
      if (!uploadFile) return;
      setUploadingIds((previous) => new Set(previous).add(id));
      void uploadFile(file, id)
        .then((uploaded) => {
          commitValues(
            setValueAtPath(valuesRef.current, id.split("."), {
              url: uploaded.url,
              filename: uploaded.filename ?? file.name,
            }),
          );
        })
        .catch(() => {
          // The host owns how a failed upload is announced (it owns the
          // transport). Swallowing it here keeps a rejected promise from
          // becoming an unhandled rejection; the field simply stays empty.
        })
        .finally(() => {
          setUploadingIds((previous) => {
            const next = new Set(previous);
            next.delete(id);
            return next;
          });
        });
    },
    [uploadFile, commitValues],
  );

  const fieldEnv = React.useMemo<FieldEnv>(
    () => ({
      ...env,
      disabled: env?.disabled ?? running,
      onDropFile: env?.onDropFile ?? (uploadFile ? handleDropFile : undefined),
      uploadingIds: env?.uploadingIds ?? uploadingIds,
    }),
    [env, running, uploadFile, handleDropFile, uploadingIds],
  );

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

  const notReady = readiness.missing.length > 0;
  // Readiness alone would let a run go out while a file is still uploading: a
  // non-gating file input (optional, or plural — `mustBeFilled` excludes lists)
  // never counts toward readiness, so Run stays live through its upload and the
  // method would run with the file simply absent. Read off `fieldEnv` rather
  // than the raw state, so a host driving its own loop through
  // `env.uploadingIds` gets the same gate.
  const uploading = (fieldEnv.uploadingIds?.size ?? 0) > 0;

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
        <button
          type="submit"
          className="mthds-run-panel-run"
          disabled={running || notReady || uploading}
        >
          {running ? "Running…" : "Run"}
        </button>
        {notReady && (
          <span className="mthds-run-panel-readiness">
            {`${readiness.ready} of ${readiness.total} ready — still needed: ${readiness.missing.join(", ")}`}
          </span>
        )}
      </div>
    </form>
  );
}
