import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, fn, userEvent, waitFor, within } from "storybook/test";
import { getPipeIOContract, type PipeIOContract } from "@pipelex/mthds-form";
import type { FieldEnv } from "@pipelex/mthds-form/react";
import { RunPanel, type UploadedFile } from "@form/react/RunPanel";
import { GRAPH_THEME, type GraphTheme } from "@graph/types";
import {
  CONTRACTS_CV_ANALYZER,
  CONTRACTS_CV_MATCHING,
  CONTRACTS_CV_SCREENING,
  CONTRACTS_OPTIONAL_STYLE_HINT,
  CONTRACTS_SMART_INPUTS_TRIAGE,
  CONTRACTS_TWO_PIPE_CHAIN,
} from "./contracts/_generated.contracts";

/**
 * Every contract here is GENERATED — `make fixtures-contracts` runs the corpus
 * bundles through pipelex and writes `_generated.contracts.ts`. None is
 * hand-authored, and that is not ceremony: an invented contract gets the
 * kernel's concept taxonomy subtly wrong (a `native.Date` input renders as
 * prose, not a date picker) and the form would then be tested against inputs no
 * method produces.
 */
function contractOf(
  contracts: Parameters<typeof getPipeIOContract>[0],
  domain: string,
  pipeCode: string,
): PipeIOContract {
  const contract = getPipeIOContract(contracts, domain, pipeCode);
  if (!contract) throw new Error(`no contract for ${domain}.${pipeCode} — regenerate the fixture`);
  return contract;
}

// A required prose input beside an OPTIONAL one — the fold case.
const NOTICE = contractOf(CONTRACTS_OPTIONAL_STYLE_HINT, "village_noticeboard", "draft_notice");
// A file input (document).
const EXTRACT = contractOf(CONTRACTS_TWO_PIPE_CHAIN, "document_analysis", "extract_and_analyze");
// A PLURAL input: never gates, and ships bare as `[]` when empty.
const ANALYZE_PAGES = contractOf(CONTRACTS_TWO_PIPE_CHAIN, "document_analysis", "analyze_pages");
// Structured concepts plus a list — nested objects inside the form.
const TRIAGE = contractOf(CONTRACTS_SMART_INPUTS_TRIAGE, "claims_desk", "triage_case");
// An image input alongside two structured ones.
const COMPOSE_REPORT = contractOf(CONTRACTS_CV_SCREENING, "recruitment", "compose_report");
// Two pipes of the SAME method that both declare a required `cv` document —
// which is what makes a late upload after a pipe switch dangerous rather than
// merely untidy.
const CV_SCREENING = contractOf(CONTRACTS_CV_SCREENING, "recruitment", "cv_screening");
const EXTRACT_CV = contractOf(CONTRACTS_CV_SCREENING, "recruitment", "extract_cv");
// Two required document inputs side by side, so two uploads can be in flight at
// once — the ordinary shape that makes a same-batch write-back collision real.
const SCREEN_CANDIDATE = contractOf(
  CONTRACTS_CV_ANALYZER,
  "candidate_screening",
  "screen_candidate",
);
// A LIST of documents beside a singular one — the only shape in which the
// upload gate is observable at all, since a required singular file leaves
// readiness unmet for the whole upload and Run is blocked either way.
const SCREEN_CVS = contractOf(CONTRACTS_CV_MATCHING, "cv_matching", "screen_cvs");

/**
 * The panel is fully controlled, so every story owns the values. This wrapper is
 * the host in miniature: it holds the values, records what `onRun` was handed,
 * and shows the payload so a reviewer can see the wire format the gate produced.
 */
function PanelHost({
  contract,
  title,
  running,
  theme = GRAPH_THEME.DARK,
  initialValues = {},
  env,
  uploadFile,
  translate,
}: {
  contract: PipeIOContract;
  title: string;
  running?: boolean;
  theme?: GraphTheme;
  initialValues?: Record<string, unknown>;
  env?: FieldEnv;
  uploadFile?: (file: File, fieldId: string) => Promise<UploadedFile>;
  translate?: React.ComponentProps<typeof RunPanel>["translate"];
}) {
  const [values, setValues] = React.useState<Record<string, unknown>>(initialValues);
  const [payload, setPayload] = React.useState<Record<string, unknown> | null>(null);

  return (
    <div style={{ display: "grid", gap: 16, maxWidth: 620 }}>
      <RunPanel
        contract={contract}
        values={values}
        onValuesChange={setValues}
        onRun={setPayload}
        running={running}
        title={title}
        theme={theme}
        env={env}
        uploadFile={uploadFile}
        translate={translate}
      />
      <pre
        data-testid="run-payload"
        style={{
          margin: 0,
          padding: 12,
          borderRadius: 8,
          background: "#0f172a",
          color: "#e2e8f0",
          font: "12px/1.5 ui-monospace, monospace",
          whiteSpace: "pre-wrap",
        }}
      >
        {payload ? JSON.stringify(payload, null, 2) : "onRun has not fired yet"}
      </pre>
    </div>
  );
}

/** Throws where an `async` host would reject — the two must behave alike. */
const throwingUploadSpy = fn((): Promise<UploadedFile> => {
  throw new Error("upload not configured");
});

/** Used by the one story that has to observe `onRun` rather than its payload. */
const uploadingGateSpy = fn();
const notReadyGateSpy = fn();
const runningGateSpy = fn();

const meta: Meta<typeof PanelHost> = {
  title: "Form/RunPanel",
  component: PanelHost,
  parameters: { backgrounds: { default: "dark" } },
  decorators: [
    (Story) => (
      <div style={{ padding: 24 }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof PanelHost>;

/**
 * A required input and an optional one. The optional starts folded away, so the
 * form opens at its simplest shape, and Run stays disabled until the required
 * input has a value — the readiness verdict, straight from the kernel.
 */
export const RequiredAndOptional: Story = {
  args: { contract: NOTICE, title: "draft_notice" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const run = canvas.getByRole("button", { name: "Run" });

    // Nothing filled in: the button is inert and the panel says what is missing.
    await expect(run).toBeDisabled();
    await expect(canvas.getByText(/still needed/)).toBeInTheDocument();

    // The readiness line is the only thing on screen saying WHY Run is inert,
    // and a disabled button is out of the tab order — so nobody walking the
    // controls ever reaches it. The association is what makes the reason
    // available at all, which is why it is asserted rather than assumed.
    await expect(run).toHaveAccessibleDescription(/still needed/);

    // The optional input is folded until asked for.
    await expect(canvas.queryByLabelText(/style_hint/i)).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: /optional input/i }));
    await expect(canvas.getByLabelText(/style_hint/i)).toBeInTheDocument();

    // Filling the required input flips readiness.
    await userEvent.type(canvas.getByLabelText(/subject/i), "Bridge closure");
    await waitFor(() => expect(run).toBeEnabled());

    // ...and the description goes with it: an enabled button described by a
    // readiness line that no longer says anything would be worse than none.
    await expect(run).not.toHaveAttribute("aria-describedby");

    // The blank optional is OMITTED from the wire payload — not sent as "".
    await userEvent.click(run);
    await waitFor(() => {
      const payload = JSON.parse(canvas.getByTestId("run-payload").textContent ?? "{}") as Record<
        string,
        unknown
      >;
      expect(payload.subject).toEqual({
        concept: "native.Text",
        content: { text: "Bridge closure" },
      });
      expect(payload).not.toHaveProperty("style_hint");
    });
  },
};

/**
 * A plural input. It is required — it keeps its place in the form — but it never
 * gates: a plural slot is never "absent" in MTHDS, its empty form IS the empty
 * list. So Run is live from the start, and an untouched plural ships bare.
 */
export const PluralInput: Story = {
  args: { contract: ANALYZE_PAGES, title: "analyze_pages" },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const run = canvas.getByRole("button", { name: "Run" });

    await expect(run).toBeEnabled();
    await userEvent.click(run);

    await waitFor(() => {
      const payload = JSON.parse(canvas.getByTestId("run-payload").textContent ?? "{}") as Record<
        string,
        unknown
      >;
      // Bare `[]`, WITHOUT the {concept, content} envelope: the envelope routes
      // an empty list to a factory that cannot type it.
      expect(payload.pages).toEqual([]);
    });
  },
};

/** A file input: the dropzone control, rendered by the kernel. */
export const FileInput: Story = {
  args: { contract: EXTRACT, title: "extract_and_analyze" },
};

/** An image input beside two structured concepts, each with nested fields. */
export const ImageAndStructured: Story = {
  args: { contract: COMPOSE_REPORT, title: "compose_report" },
};

/** Structured concepts and a list of them, nested inside the form. */
export const StructuredInputs: Story = {
  args: { contract: TRIAGE, title: "triage_case" },
};

/**
 * The same panel in light.
 *
 * `theme` does double duty (design Decision D): it selects this library's own
 * palette for the panel chrome, AND toggles the kernel's `.dark` class, which is
 * how the shadcn tokens behind the controls flip. One prop, both halves — which
 * is the point, since a panel whose chrome and controls disagreed on the theme
 * would look broken in a way no host could fix from the outside.
 */
export const LightTheme: Story = {
  args: {
    contract: NOTICE,
    title: "draft_notice",
    theme: GRAPH_THEME.LIGHT,
    initialValues: { subject: "Bridge closure" },
  },
  parameters: { backgrounds: { default: "light" } },
};

/** A run in flight: every control and the button go inert. */
export const Running: Story = {
  args: {
    contract: NOTICE,
    title: "draft_notice",
    running: true,
    initialValues: { subject: "Bridge closure" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByRole("button", { name: "Running…" })).toBeDisabled();
  },
};

/**
 * A form that passes readiness and still fails the gate.
 *
 * Every gating input has a value, so readiness is satisfied — but `amount` is a
 * number field holding prose, which ajv rejects. The missing-input scan finds
 * nothing to name (nothing IS missing), so the summary falls back to the ajv
 * errors: the documented legitimate state that, without the fallback, would
 * block the run while saying nothing about why.
 */
export const InvalidSubmit: Story = {
  args: {
    contract: TRIAGE,
    title: "triage_case",
    initialValues: {
      invoice: { amount: "twelve euros", invoice_number: "INV-1" },
      priority: { number: "3" },
      question: { text: "Is this covered?" },
      tags: [],
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const run = canvas.getByRole("button", { name: "Run" });

    await waitFor(() => expect(run).toBeEnabled());
    await userEvent.click(run);

    const alert = await canvas.findByRole("alert");
    await expect(alert).toBeInTheDocument();
    await expect(canvas.getByTestId("run-payload")).toHaveTextContent("onRun has not fired yet");
  },
};

/**
 * Emptying a filled optional must not make its input disappear from under the
 * cursor. Visibility while the fold is collapsed used to be derived from the
 * LIVE value, so clearing the last character flipped the field to "foldable"
 * and React unmounted the very input being typed into — focus lost, every
 * keystroke after it going nowhere.
 *
 * The host pre-filling an optional is the shortest way to reach it, and it is
 * the documented controlled pattern (restore a draft, re-run with last time's
 * inputs). It is equally reachable with no host at all: expand the fold, fill
 * an optional, collapse it — it stays on screen because it is filled — then
 * clear it.
 */
export const OptionalSurvivesBeingCleared: Story = {
  args: {
    contract: NOTICE,
    title: "draft_notice",
    initialValues: { subject: "Bridge closure", style_hint: "formal" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Filled, so it shows even though the fold is collapsed.
    const hint = canvas.getByLabelText(/style_hint/i);
    await expect(hint).toBeInTheDocument();

    await userEvent.clear(hint);

    // Still there, still the SAME node, and still holding focus — which is the
    // symptom this pins. `getByLabelText` would find a remounted input just as
    // happily, so the identity and focus checks are the ones that bite.
    await expect(canvas.getByLabelText(/style_hint/i)).toBe(hint);
    await expect(hint).toBeInTheDocument();
    await expect(hint).toHaveFocus();

    // Emptied all the same: the wire omits it either way, which is why keeping
    // the input on screen costs nothing.
    await expect(hint).toHaveValue("");
  },
};

/**
 * The other half of the latch: keeping an emptied optional on screen must not
 * make that permanent. The full round trip a user actually takes — reveal it,
 * fill it, empty it, put it back — and each leg pins a different half. Emptying
 * it has to bring the toggle back, which only happens because the toggle counts
 * what a collapse WOULD hide rather than what is hidden right now; and using
 * the toggle has to actually fold the field away, which only happens because
 * the transition clears the latch. Miss either and the empty input is stuck in
 * the form for the rest of the contract's life with no control that removes it.
 */
export const ClearedOptionalCanFoldAwayAgain: Story = {
  args: {
    contract: NOTICE,
    title: "draft_notice",
    initialValues: { subject: "Bridge closure" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Folded away to start with, and the toggle offers it.
    await expect(canvas.queryByLabelText(/style_hint/i)).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: /optional/i }));

    // Revealed. Filling it takes the toggle away, and that much is right: a
    // filled optional is never what a collapse hides.
    const hint = await canvas.findByLabelText(/style_hint/i);
    await userEvent.type(hint, "formal");
    await waitFor(() =>
      expect(canvas.queryByRole("button", { name: /optional/i })).not.toBeInTheDocument(),
    );

    // Emptied. The field stays — that is the latch, pinned next door — but it is
    // foldable again, so the way out of it has to be offered again.
    await userEvent.clear(hint);
    await expect(hint).toBeInTheDocument();
    const toggle = await canvas.findByRole("button", { name: /optional/i });

    // And it has to work: the click clears the latch, so the empty input folds.
    await userEvent.click(toggle);
    await waitFor(() => expect(canvas.queryByLabelText(/style_hint/i)).not.toBeInTheDocument());

    // The required input is untouched by any of this.
    await expect(canvas.getByLabelText(/subject/i)).toHaveValue("Bridge closure");
  },
};

/**
 * `env.disabled` is the host's, and the panel must not overwrite it. The prop
 * documents a per-key rule — the host's value wins, the panel fills in only
 * what was left undefined — and `disabled` is the key that falls back to
 * `running`. With `running` unset there is nothing to fall back to, so a host
 * that freezes the form freezes it.
 */
export const HostDisablesEveryField: Story = {
  args: {
    contract: NOTICE,
    title: "draft_notice",
    initialValues: { subject: "Bridge closure" },
    env: { disabled: true },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Readiness is met, so nothing but the host's flag can be holding this.
    await expect(canvas.getByRole("button", { name: "Run" })).toBeDisabled();
    await expect(canvas.getByLabelText(/subject/i)).toBeDisabled();
  },
};

/**
 * `translate` is the panel's only i18n seam: the whole error summary is built
 * from message keys, and a host that ships in another language replaces the
 * renderer wholesale. The passthrough had no coverage — dropping the argument
 * entirely left every other story green.
 *
 * This story fills every input but gives one a value of the wrong SHAPE, so the
 * kernel's missing-variable scan comes up empty and the summary is built from
 * the raw errors.
 *
 * The summary's OTHER route — the one that names the variables — is pinned in
 * `runGate.test.ts`, not here, and deliberately so: at this kernel version it
 * is unreachable from the UI. Readiness and the gate agree about which inputs
 * are missing, so any form that would produce a named variable has Run disabled
 * and never reaches the summary at all. That agreement is the kernel's to keep,
 * not ours — it has already been broken once, by a version that reclassified a
 * wrong-shaped value from a raw error into a named variable — so the branch is
 * covered where it can actually be exercised.
 */
export const HostTranslatesTheErrorSummary: Story = {
  args: {
    contract: TRIAGE,
    title: "triage_case",
    initialValues: {
      invoice: { amount: "twelve euros", invoice_number: "INV-1" },
      priority: { number: "3" },
      question: { text: "Is this covered?" },
      tags: [],
    },
    translate: () => "TRADUIT PAR L'HÔTE",
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const run = canvas.getByRole("button", { name: "Run" });

    await waitFor(() => expect(run).toBeEnabled());
    await userEvent.click(run);

    const alert = await canvas.findByRole("alert");
    await expect(alert).toHaveTextContent("TRADUIT PAR L'HÔTE");
  },
};

/**
 * An upload in flight holds the Run button, even when readiness is satisfied.
 *
 * Readiness cannot cover this on its own: a non-gating file input — an optional
 * one, or a plural one, since `mustBeFilled` excludes lists — never counts
 * toward readiness at all, so without this gate Run stays live right through
 * such a field's upload and the method runs with the file missing. Driving it
 * from `env.uploadingIds` here also pins the other half of the contract: a host
 * that owns the whole upload loop gets the same gate as one that hands us
 * `uploadFile`.
 */
export const UploadHoldsRun: Story = {
  args: {
    contract: NOTICE,
    title: "draft_notice",
    initialValues: { subject: "Bridge closure" },
    env: { uploadingIds: new Set(["subject"]) },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Everything that gates is filled, so this is the upload gate alone.
    await expect(canvas.queryByText(/still needed/)).not.toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Run" })).toBeDisabled();
  },
};

/**
 * A host's own upload tracker must JOIN the panel's, not replace it.
 *
 * `env.onDropFile` and `env.uploadingIds` default independently per key, so a
 * host can hand the panel `uploadFile` — leaving it to own the drop, and to mark
 * the field in its own set — while also passing an upload tracker of its own.
 * Reading the host's set instead of merging the two hides an upload the panel
 * itself started, and Run stays live right through it.
 *
 * This is the one shape in the corpus where that is visible. `cvs` is a LIST of
 * documents, and `mustBeFilled` excludes lists, so it never gates readiness —
 * with `job_offer` already filled, the Run button is held by the upload gate
 * alone. A required singular file would leave readiness unmet for the whole
 * upload and the button would be disabled whether the gate worked or not.
 */
export const HostTrackerJoinsPanelUploads: Story = {
  args: {
    contract: SCREEN_CVS,
    title: "screen_cvs",
    initialValues: { job_offer: { url: "https://files.test/job.pdf", filename: "job.pdf" } },
    // An idle tracker, which is the whole point: a host that reports its own
    // uploads elsewhere in the form has nothing to say about this one.
    env: { uploadingIds: new Set<string>() },
  },
  render: function Render(args) {
    const pending = React.useRef<((file: UploadedFile) => void) | null>(null);
    const uploadFile = React.useCallback(
      () =>
        new Promise<UploadedFile>((resolve) => {
          pending.current = resolve;
        }),
      [],
    );
    return (
      <>
        <PanelHost {...args} uploadFile={uploadFile} />
        <button
          type="button"
          data-testid="settle-upload"
          onClick={() =>
            pending.current?.({ url: "https://files.test/cv.pdf", filename: "cv.pdf" })
          }
        >
          settle upload
        </button>
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Readiness is satisfied before anything is dropped: the list is empty and
    // does not gate, and the singular document is filled.
    await expect(canvas.getByRole("button", { name: "Run" })).toBeEnabled();

    // A list renders no `<input>` until a row exists, so the row comes first.
    await userEvent.click(canvas.getByRole("button", { name: "Add item" }));
    const rowInput = await waitFor(() => {
      const found = canvasElement.querySelector<HTMLInputElement>('input[id="cvs.0"]');
      if (!found) throw new Error("no file input for cvs.0");
      return found;
    });

    // The panel owns this upload and marks `cvs.0` in ITS set. The host's set
    // stays empty throughout — so this assertion is what fails if the host's
    // set replaces ours rather than joining it.
    fireEvent.change(rowInput, {
      target: { files: [new File(["pdf"], "cv.pdf", { type: "application/pdf" })] },
    });
    await waitFor(() => expect(canvas.getByRole("button", { name: "Run" })).toBeDisabled());

    // And the gate lifts when the upload lands, rather than latching.
    await userEvent.click(canvas.getByTestId("settle-upload"));
    await waitFor(() => expect(canvas.getByText("cv.pdf")).toBeInTheDocument());
    await expect(canvas.getByRole("button", { name: "Run" })).toBeEnabled();
  },
};

/**
 * A decimal in a number field must not silently veto the run.
 *
 * The kernel's number control carries native `step`/`min`/`max` constraints, and
 * a `<form>` without `noValidate` lets the browser refuse submission before any
 * handler runs: no `submit` event, so no gate, no `onRun`, and no message from
 * the panel — the button appears live and does nothing. `native.Number` accepts
 * any decimal, so the browser would be enforcing a constraint the domain does
 * not have, and saying so in its own words ("nearest valid values are ...").
 *
 * `recruitment.MatchScore.score` is a plain `number`, so this is reachable from
 * a contract the stories already render rather than a constructed one.
 */
export const DecimalNumberSubmits: Story = {
  args: {
    contract: COMPOSE_REPORT,
    title: "compose_report",
    initialValues: {
      card_image: { url: "https://files.test/card.png", filename: "card.png" },
      profile: { name: "Ada Lovelace", summary: "Engineer" },
      match: { recommendation: "hire" },
    },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    const score = canvasElement.querySelector<HTMLInputElement>('input[id="match.score"]');
    if (!score) throw new Error("no number input for match.score");
    await userEvent.type(score, "87.25");
    await waitFor(() => expect(score).toHaveValue(87.25));

    // The native constraint really is violated — this is not a hypothetical.
    const form = score.closest("form") as HTMLFormElement | null;
    await expect(score.validity.stepMismatch).toBe(true);

    const run = canvas.getByRole("button", { name: "Run" });
    await waitFor(() => expect(run).toBeEnabled());

    // `requestSubmit()` rather than a click, and deliberately: `userEvent.click`
    // does NOT run interactive validation, so it cannot see this class of bug —
    // it reported a successful submit against the unfixed panel. `requestSubmit`
    // does run it, which is why it is both the honest probe here and the path
    // `docs/run-form-panel.md` promises hosts is safe.
    form?.requestSubmit();

    // The gate must have run at all. Before `noValidate` this stayed on its
    // placeholder, with nothing anywhere to say why.
    await waitFor(() => {
      const payload = JSON.parse(canvas.getByTestId("run-payload").textContent ?? "{}") as Record<
        string,
        Record<string, unknown>
      >;
      expect(payload.match?.content).toMatchObject({ score: 87.25 });
    });
  },
};

/**
 * A slow upload must not undo what the user did while waiting for it.
 *
 * The write-back happens in a promise continuation, which resolves long after
 * the render that started it — so it has to target the LATEST values, not the
 * ones that render captured. Here `card_image` is dropped and left hanging, the
 * user types a name meanwhile (exactly what someone does while waiting), and
 * only then does the upload settle. If its continuation wrote into its own
 * captured snapshot, the typing would be erased.
 */
export const UploadKeepsConcurrentEdits: Story = {
  args: { contract: COMPOSE_REPORT, title: "compose_report" },
  render: function Render(args) {
    // The upload is held open until the story releases it. A module-level ref
    // would leak between story runs, so it belongs to the render.
    const pending = React.useRef<((file: UploadedFile) => void) | null>(null);
    const uploadFile = React.useCallback(
      () =>
        new Promise<UploadedFile>((resolve) => {
          pending.current = resolve;
        }),
      [],
    );
    return (
      <>
        <PanelHost {...args} uploadFile={uploadFile} />
        <button
          type="button"
          data-testid="settle-upload"
          onClick={() =>
            pending.current?.({ url: "https://files.test/card.png", filename: "card.png" })
          }
        >
          settle upload
        </button>
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const fileInput = canvasElement.querySelector<HTMLInputElement>('input[id="card_image"]');
    if (!fileInput) throw new Error("no file input for card_image");

    // Drop the image. It hangs, and the panel holds Run while it does — the
    // panel-driven half of the upload gate.
    fireEvent.change(fileInput, {
      target: { files: [new File(["png"], "card.png", { type: "image/png" })] },
    });
    await waitFor(() => expect(canvas.getByRole("button", { name: "Run" })).toBeDisabled());

    // The user types while waiting.
    const nameInput = canvasElement.querySelector<HTMLInputElement>('input[id="profile.name"]');
    if (!nameInput) throw new Error("no text input for profile.name");
    await userEvent.type(nameInput, "Ada Lovelace");
    await waitFor(() => expect(nameInput).toHaveValue("Ada Lovelace"));

    // Now let the upload settle. Its continuation must merge, not overwrite.
    await userEvent.click(canvas.getByTestId("settle-upload"));

    // The file landed...
    await waitFor(() => expect(canvas.getByText("card.png")).toBeInTheDocument());
    // ...and the typing survived it. This is the assertion that fails if the
    // continuation writes into the values its own render captured.
    await expect(
      canvasElement.querySelector<HTMLInputElement>('input[id="profile.name"]'),
    ).toHaveValue("Ada Lovelace");
  },
};

/**
 * A file uploaded for one pipe must not land in the next one.
 *
 * Selecting a different pipe resets the values, so a late upload writing into
 * its own captured path was easy to dismiss as harmless — the run gate builds
 * its payload from `contract.inputs` and ignores keys no field owns. It is not
 * harmless when the two pipes share an input name, which happens inside a
 * single method: `recruitment.cv_screening` and `recruitment.extract_cv` both
 * declare a required `cv` document. The stale file then arrives looking like a
 * deliberate answer for the newly selected pipe, gating satisfied, ready to be
 * sent — so the panel discards any result that resolves under a contract other
 * than the one its drop happened under.
 */
export const UploadDiscardedAfterPipeSwitch: Story = {
  args: { contract: CV_SCREENING, title: "cv_screening" },
  render: function Render(args) {
    const pending = React.useRef<((file: UploadedFile) => void) | null>(null);
    const [contract, setContract] = React.useState(args.contract);
    const uploadFile = React.useCallback(
      () =>
        new Promise<UploadedFile>((resolve) => {
          pending.current = resolve;
        }),
      [],
    );
    return (
      <>
        <PanelHost {...args} contract={contract} uploadFile={uploadFile} />
        <button type="button" data-testid="switch-pipe" onClick={() => setContract(EXTRACT_CV)}>
          switch to extract_cv
        </button>
        <button
          type="button"
          data-testid="settle-upload"
          onClick={() =>
            pending.current?.({ url: "https://files.test/other.pdf", filename: "other.pdf" })
          }
        >
          settle upload
        </button>
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const fileInput = canvasElement.querySelector<HTMLInputElement>('input[id="cv"]');
    if (!fileInput) throw new Error("no file input for cv");

    // Drop a CV under `cv_screening`. It hangs.
    fireEvent.change(fileInput, {
      target: { files: [new File(["%PDF"], "other.pdf", { type: "application/pdf" })] },
    });
    await waitFor(() => expect(canvas.getByRole("button", { name: "Run" })).toBeDisabled());

    // Switch to `extract_cv`, which also takes a required `cv`.
    await userEvent.click(canvas.getByTestId("switch-pipe"));

    // The upload from the previous pipe settles now.
    await userEvent.click(canvas.getByTestId("settle-upload"));

    // It must not have filled the new pipe's `cv`: the form still asks for it,
    // and Run stays inert. Without the guard, `other.pdf` would be sitting there
    // as if the user had chosen it for this pipe.
    await waitFor(() => expect(canvas.getByText(/still needed/)).toBeInTheDocument());
    await expect(canvas.queryByText("other.pdf")).not.toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Run" })).toBeDisabled();
  },
};

/**
 * Settles the departed upload from inside the switch's own commit.
 *
 * A layout effect is the only place a test can stand to observe the window this
 * story is about, because it is the only host code that runs between "the new
 * form is committed" and "passive effects flush". Rendered after the panel, so
 * React reaches it second when it walks the tree running layout effects — which
 * is what makes the panel's own marker either already updated (fixed) or still
 * pending (not).
 */
function SettleUploadOnCommit({
  contract,
  pending,
}: {
  contract: PipeIOContract;
  pending: React.RefObject<((file: UploadedFile) => void) | null>;
}) {
  const isFirstCommit = React.useRef(true);
  React.useLayoutEffect(() => {
    if (isFirstCommit.current) {
      isFirstCommit.current = false;
      return;
    }
    pending.current?.({ url: "https://files.test/other.pdf", filename: "other.pdf" });
  }, [contract, pending]);
  return null;
}

/**
 * The generation marker must be current the moment the new form is on screen.
 *
 * Tying an upload to its contract only works if "which pipe is showing" is
 * answered as of the last COMMIT. A passive effect answers later than that —
 * React schedules those on a task, while an upload settling is a promise
 * continuation, i.e. a microtask, which runs first. In that window the switched
 * form is already rendered and the marker still names the pipe the user left,
 * so the write-back's guard compares the departed contract against itself,
 * finds them equal, and lets through exactly the write it exists to reject:
 * `other.pdf` lands in the new pipe's `cv` looking deliberate.
 *
 * Two details of the harness are load-bearing, and both are what the window
 * genuinely requires rather than scaffolding for its own sake.
 *
 * The switch is scheduled off a timer, because where the update ORIGINATES
 * decides whether the gap exists at all. Measured on this React: a discrete
 * click commits and flushes its passive effects before any microtask, and so
 * does a `startTransition` started from one. Only an update arriving from
 * outside a React event handler leaves the passive effect pending across the
 * microtask checkpoint — a timer here, and in a real host the same thing a
 * fetch continuation, a router subscription or a websocket message does when it
 * selects a pipe.
 *
 * And the upload settles from a layout effect, because the window closes at the
 * end of the commit and that is the only place inside it a component can act.
 */
export const UploadDiscardedBeforeEffectsFlush: Story = {
  args: { contract: CV_SCREENING, title: "cv_screening" },
  render: function Render(args) {
    const pending = React.useRef<((file: UploadedFile) => void) | null>(null);
    const [contract, setContract] = React.useState(args.contract);
    const uploadFile = React.useCallback(
      () =>
        new Promise<UploadedFile>((resolve) => {
          pending.current = resolve;
        }),
      [],
    );
    return (
      <>
        <PanelHost {...args} contract={contract} uploadFile={uploadFile} />
        <SettleUploadOnCommit contract={contract} pending={pending} />
        <button
          type="button"
          data-testid="switch-pipe"
          onClick={() => setTimeout(() => setContract(EXTRACT_CV), 0)}
        >
          switch to extract_cv
        </button>
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const fileInput = canvasElement.querySelector<HTMLInputElement>('input[id="cv"]');
    if (!fileInput) throw new Error("no file input for cv");

    // Drop a CV under `cv_screening`. It hangs.
    fireEvent.change(fileInput, {
      target: { files: [new File(["%PDF"], "other.pdf", { type: "application/pdf" })] },
    });
    await waitFor(() => expect(canvas.getByRole("button", { name: "Run" })).toBeDisabled());

    // The switch lands off a timer; the upload settles inside its commit.
    await userEvent.click(canvas.getByTestId("switch-pipe"));

    // Same verdict the untimed case gets: the file belonged to the pipe the
    // user left, so `extract_cv` is still asking for a CV of its own.
    await waitFor(() => expect(canvas.getByText(/still needed/)).toBeInTheDocument());
    await expect(canvas.queryByText("other.pdf")).not.toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Run" })).toBeDisabled();
  },
};

/**
 * Coming back to the pipe you left must not revive its abandoned upload.
 *
 * A host that keeps its contracts in a map hands back the SAME object every
 * time a pipe is selected, so leaving pipe A and returning to it restores the
 * marker's old value — ABA, and an identity check reads it as "same pipe,
 * accept it". It is not the same form. Switching away emptied `uploadingIds`,
 * so the upload stopped gating Run and its dropzone re-opened; letting the
 * result land now puts a file into a form that never marked it, after a window
 * in which Run was live the whole time — and for a non-gating input the run may
 * already have gone out without it. Counting generations instead of comparing
 * contracts makes the question "has the form moved on since this drop", which
 * is the one the guard was always asking.
 */
export const UploadNotRevivedByReturningToPipe: Story = {
  args: { contract: CV_SCREENING, title: "cv_screening" },
  render: function Render(args) {
    const pending = React.useRef<((file: UploadedFile) => void) | null>(null);
    const [contract, setContract] = React.useState(args.contract);
    const uploadFile = React.useCallback(
      () =>
        new Promise<UploadedFile>((resolve) => {
          pending.current = resolve;
        }),
      [],
    );
    return (
      <>
        <PanelHost {...args} contract={contract} uploadFile={uploadFile} />
        <button type="button" data-testid="switch-away" onClick={() => setContract(EXTRACT_CV)}>
          switch to extract_cv
        </button>
        {/* The very same object the panel started with — which is what a host
            holding a contracts map hands back, not a contrivance. */}
        <button type="button" data-testid="switch-back" onClick={() => setContract(CV_SCREENING)}>
          back to cv_screening
        </button>
        <button
          type="button"
          data-testid="settle-upload"
          onClick={() =>
            pending.current?.({ url: "https://files.test/other.pdf", filename: "other.pdf" })
          }
        >
          settle upload
        </button>
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const fileInput = canvasElement.querySelector<HTMLInputElement>('input[id="cv"]');
    if (!fileInput) throw new Error("no file input for cv");

    // Drop a CV under `cv_screening`. It hangs.
    fireEvent.change(fileInput, {
      target: { files: [new File(["%PDF"], "other.pdf", { type: "application/pdf" })] },
    });
    await waitFor(() => expect(canvas.getByRole("button", { name: "Run" })).toBeDisabled());

    // Away and back, to the identical contract object.
    await userEvent.click(canvas.getByTestId("switch-away"));
    await userEvent.click(canvas.getByTestId("switch-back"));

    // The upload the user abandoned settles now.
    await userEvent.click(canvas.getByTestId("settle-upload"));

    // It was abandoned, so it stays abandoned: the form asks for a CV, and
    // nothing arrived that the form had not been marking as on its way.
    await waitFor(() => expect(canvas.getByText(/still needed/)).toBeInTheDocument());
    await expect(canvas.queryByText("other.pdf")).not.toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Run" })).toBeDisabled();
  },
};

/**
 * Unmounting the panel abandons its uploads too — not just switching `contract`.
 *
 * A host may well never change the prop: `<RunPanel key={pipeRef} …>` is the
 * ordinary React idiom for "reset this child when the entity changes", and it
 * unmounts one instance and mounts another instead. The generation effect then
 * never re-runs, so a marker bumped only on a dep change still equals the
 * departed upload's — while `onValuesChange` is the HOST's setter, living above
 * the key and very much still alive. The abandoned CV would land in the
 * replacement panel's `cv` looking chosen. Hence the bump on cleanup, which is
 * the one place both ways of leaving pass through.
 *
 * The values state lives ABOVE the key here on purpose: that is what "fully
 * controlled" means, and it is what makes the stale write reachable at all.
 */
export const UploadDiscardedOnUnmount: Story = {
  args: { contract: CV_SCREENING, title: "cv_screening" },
  render: function Render(args) {
    const pending = React.useRef<((file: UploadedFile) => void) | null>(null);
    const [contract, setContract] = React.useState(args.contract);
    const [values, setValues] = React.useState<Record<string, unknown>>({});
    const uploadFile = React.useCallback(
      () =>
        new Promise<UploadedFile>((resolve) => {
          pending.current = resolve;
        }),
      [],
    );
    return (
      <div style={{ display: "grid", gap: 16, maxWidth: 620 }}>
        <RunPanel
          // The keyed remount is the whole point of this story.
          key={contract === CV_SCREENING ? "cv_screening" : "extract_cv"}
          contract={contract}
          values={values}
          onValuesChange={setValues}
          onRun={() => {}}
          title={args.title}
          theme={GRAPH_THEME.DARK}
          uploadFile={uploadFile}
        />
        <button type="button" data-testid="switch-away" onClick={() => setContract(EXTRACT_CV)}>
          switch to extract_cv
        </button>
        <button
          type="button"
          data-testid="settle-upload"
          onClick={() =>
            pending.current?.({ url: "https://files.test/other.pdf", filename: "other.pdf" })
          }
        >
          settle upload
        </button>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const fileInput = canvasElement.querySelector<HTMLInputElement>('input[id="cv"]');
    if (!fileInput) throw new Error("no file input for cv");

    fireEvent.change(fileInput, {
      target: { files: [new File(["%PDF"], "other.pdf", { type: "application/pdf" })] },
    });
    await waitFor(() => expect(canvas.getByRole("button", { name: "Run" })).toBeDisabled());

    // The key changes, so this panel is destroyed rather than re-rendered.
    await userEvent.click(canvas.getByTestId("switch-away"));
    await userEvent.click(canvas.getByTestId("settle-upload"));

    // `extract_cv` also takes a required `cv`, so a stale write would show up
    // here as a satisfied form rather than as anything obviously wrong.
    await waitFor(() => expect(canvas.getByText(/still needed/)).toBeInTheDocument());
    await expect(canvas.queryByText("other.pdf")).not.toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Run" })).toBeDisabled();
  },
};

/**
 * The gate belongs to the submit path, not to the button's `disabled` — all of it.
 *
 * Disabling Run does hold the keyboard: it is this form's only submit button, so
 * it is the default button, and implicit submission on a disabled default button
 * does nothing. `form.requestSubmit()` is the gap — it ignores the submitter, and
 * the panel renders a real `<form>` in the host's DOM under a documented class
 * name, so a host running the form from its own button reaches it.
 *
 * Three panels because the button gates on three terms and none is covered by the
 * kernel gate that runs afterwards. **Uploading**: a non-gating file input never
 * counts toward readiness, so the run goes out without its file. **Not ready**: a
 * blank required text input reaches ajv as `{ text: "" }`, a perfectly valid
 * string, so `runSubmitGate` accepts it and only readiness objects — pinned in
 * `runGate.test.ts`. **Running**: a second run over the first is a duplicate
 * execution. Each panel is blocked by exactly one of them.
 */
const doubleSubmitSpy = fn();
const noStateOnRunSpy = fn();

/**
 * Two `requestSubmit()` calls in one synchronous block start ONE run.
 *
 * The gate is a render-scoped value, so before the latch both calls closed over
 * the same `blocked === false` and both reached `onRun` — the host here does
 * everything the docs ask, setting `running` synchronously inside `onRun`, and
 * it made no difference, because React had not re-rendered between the two
 * calls. What it cost was a duplicate execution, which nothing downstream
 * undoes.
 *
 * Two real clicks were never affected and are not what this pins: they are two
 * tasks with a commit between them, so the second already saw `running`.
 */
export const ProgrammaticDoubleSubmitStartsOneRun: Story = {
  args: { contract: NOTICE, title: "draft_notice" },
  render: function Render(args) {
    const [running, setRunning] = React.useState(false);
    return (
      <RunPanel
        contract={args.contract}
        values={{ subject: "Bridge closure" }}
        onValuesChange={() => {}}
        theme={GRAPH_THEME.DARK}
        running={running}
        onRun={(inputs) => {
          doubleSubmitSpy(inputs);
          // Synchronously, before any await — exactly what the prop's doc asks.
          setRunning(true);
        }}
        title="draft_notice"
      />
    );
  },
  play: async ({ canvasElement }) => {
    doubleSubmitSpy.mockClear();
    const form = canvasElement.querySelector<HTMLFormElement>("form.mthds-run-panel");
    if (!form) throw new Error("no run panel form");

    form.requestSubmit();
    form.requestSubmit();

    await expect(doubleSubmitSpy).toHaveBeenCalledTimes(1);
  },
};

/**
 * The latch cannot wedge a host whose `onRun` schedules no state update.
 *
 * This is the failure mode that makes the panel refuse to hold a lock for the
 * LIFETIME of a run: it is told when a run starts and never that one finished,
 * so such a lock would have no release and this host — which passes no `running`
 * and sets no state — would be dead after its first run. The latch releases on a
 * microtask instead, which is queued unconditionally and always runs, so each
 * later submit gets through.
 */
export const LatchReleasesWithoutAnyStateUpdate: Story = {
  args: { contract: NOTICE, title: "draft_notice" },
  render: function Render(args) {
    return (
      <RunPanel
        contract={args.contract}
        values={{ subject: "Bridge closure" }}
        onValuesChange={() => {}}
        theme={GRAPH_THEME.DARK}
        onRun={(inputs) => {
          noStateOnRunSpy(inputs);
        }}
        title="draft_notice"
      />
    );
  },
  play: async ({ canvasElement }) => {
    noStateOnRunSpy.mockClear();
    const canvas = within(canvasElement);
    const button = canvas.getByRole("button", { name: /^Run$/i });

    await userEvent.click(button);
    await userEvent.click(button);
    await userEvent.click(button);

    await expect(noStateOnRunSpy).toHaveBeenCalledTimes(3);
  },
};

export const RequestSubmitRespectsEveryGate: Story = {
  args: { contract: NOTICE, title: "draft_notice" },
  render: function Render(args) {
    // Spies rather than the shared host, because `onRun` fires synchronously
    // inside the submit handler: asserting on it directly leaves nothing to wait
    // for, where reading a rendered payload would race React's commit.
    const common = {
      contract: args.contract,
      onValuesChange: () => {},
      theme: GRAPH_THEME.DARK,
    };
    return (
      <div style={{ display: "grid", gap: 24, maxWidth: 620 }}>
        <div data-testid="gate-uploading">
          <RunPanel
            {...common}
            values={{ subject: "Bridge closure" }}
            onRun={uploadingGateSpy}
            title="uploading"
            env={{ uploadingIds: new Set(["subject"]) }}
          />
        </div>
        <div data-testid="gate-not-ready">
          {/* Blank, not absent — the shape the kernel gate accepts. */}
          <RunPanel {...common} values={{ subject: "" }} onRun={notReadyGateSpy} title="notReady" />
        </div>
        <div data-testid="gate-running">
          <RunPanel
            {...common}
            values={{ subject: "Bridge closure" }}
            onRun={runningGateSpy}
            title="running"
            running
          />
        </div>
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    for (const spy of [uploadingGateSpy, notReadyGateSpy, runningGateSpy]) spy.mockClear();

    const submit = (testId: string) => {
      const form = canvasElement.querySelector<HTMLFormElement>(
        `[data-testid="${testId}"] form.mthds-run-panel`,
      );
      if (!form) throw new Error(`no run panel form in ${testId}`);
      form.requestSubmit();
    };

    submit("gate-uploading");
    submit("gate-not-ready");
    submit("gate-running");

    await expect(uploadingGateSpy).not.toHaveBeenCalled();
    await expect(notReadyGateSpy).not.toHaveBeenCalled();
    await expect(runningGateSpy).not.toHaveBeenCalled();
  },
};

/**
 * A departed upload must not un-mark the one that replaced it.
 *
 * Discarding the stale write-back is only half of tying an upload to its pipe.
 * Switching contracts empties `uploadingIds`, which re-enables the dropzone —
 * so the user can drop again on the SAME field id, since that is exactly what
 * two pipes sharing `cv` means. When the first upload then settles, an
 * unconditional cleanup deletes that shared id and the second upload goes
 * unmarked while still running: its dropzone re-opens mid-flight, its progress
 * indicator disappears, and the Run gate lets go of it. The cleanup is scoped
 * to its own generation for the same reason the write-back is.
 */
export const UploadCleanupStaysWithItsPipe: Story = {
  args: { contract: CV_SCREENING, title: "cv_screening" },
  render: function Render(args) {
    // Two uploads have to be settleable independently here, so the resolvers
    // queue up in call order rather than the single slot the other stories use.
    const pending = React.useRef<((file: UploadedFile) => void)[]>([]);
    const [contract, setContract] = React.useState(args.contract);
    const uploadFile = React.useCallback(
      () =>
        new Promise<UploadedFile>((resolve) => {
          pending.current.push(resolve);
        }),
      [],
    );
    return (
      <>
        <PanelHost {...args} contract={contract} uploadFile={uploadFile} />
        <button type="button" data-testid="switch-pipe" onClick={() => setContract(EXTRACT_CV)}>
          switch to extract_cv
        </button>
        <button
          type="button"
          data-testid="settle-first"
          onClick={() => pending.current[0]?.({ url: "https://files.test/first.pdf" })}
        >
          settle the first upload
        </button>
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const drop = (name: string) => {
      const input = canvasElement.querySelector<HTMLInputElement>('input[id="cv"]');
      if (!input) throw new Error("no file input for cv");
      fireEvent.change(input, {
        target: { files: [new File(["%PDF"], name, { type: "application/pdf" })] },
      });
    };

    // First upload, under `cv_screening`. It hangs.
    drop("first.pdf");
    await waitFor(() => expect(canvas.getByText(/Uploading/)).toBeInTheDocument());

    // Switching pipes releases the gate, which is what re-opens the dropzone.
    await userEvent.click(canvas.getByTestId("switch-pipe"));
    await waitFor(() => expect(canvas.queryByText(/Uploading/)).not.toBeInTheDocument());

    // Second upload, under `extract_cv`, on the same `cv` field. Also hangs.
    drop("second.pdf");
    await waitFor(() => expect(canvas.getByText(/Uploading/)).toBeInTheDocument());

    // Now the first one settles. It belongs to a pipe that is no longer on
    // screen, so it must leave the second upload's bookkeeping alone.
    await userEvent.click(canvas.getByTestId("settle-first"));

    // Still uploading, still gated. Without the generation check the indicator
    // would be gone and Run would be live over a file that never arrived.
    await expect(canvas.getByText(/Uploading/)).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Run" })).toBeDisabled();
  },
};

/**
 * Two uploads finishing together must both survive.
 *
 * The write-back reads a mirror of the latest values because the render that
 * started it is long gone. But an effect refreshes that mirror only after a
 * re-render, and two continuations resolving in the same React batch both run
 * before any render happens — so both would read the same snapshot and the
 * second write would silently drop the first. `screen_candidate` takes a `cv`
 * and a `job_offer`, so this is the ordinary two-file form, not a contrived
 * one, and the loss is invisible: both dropzones show a filename while one
 * value is no longer in the values at all. The continuation advances the mirror
 * itself, which fixes it without widening `onValuesChange` into a functional
 * updater.
 */
export const ConcurrentUploadsBothLand: Story = {
  args: { contract: SCREEN_CANDIDATE, title: "screen_candidate" },
  render: function Render(args) {
    const pending = React.useRef<Map<string, (file: UploadedFile) => void>>(new Map());
    const uploadFile = React.useCallback(
      (_file: File, fieldId: string) =>
        new Promise<UploadedFile>((resolve) => {
          pending.current.set(fieldId, resolve);
        }),
      [],
    );
    return (
      <>
        <PanelHost {...args} uploadFile={uploadFile} />
        <button
          type="button"
          data-testid="settle-both"
          onClick={() => {
            // Resolved back to back, so both continuations run as microtasks
            // before React re-renders — which is precisely the batch the
            // effect-refreshed mirror cannot keep up with.
            pending.current.get("cv")?.({ url: "https://files.test/cv.pdf", filename: "cv.pdf" });
            pending.current.get("job_offer")?.({
              url: "https://files.test/offer.pdf",
              filename: "offer.pdf",
            });
          }}
        >
          settle both uploads
        </button>
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const drop = (fieldId: string, name: string) => {
      const input = canvasElement.querySelector<HTMLInputElement>(`input[id="${fieldId}"]`);
      if (!input) throw new Error(`no file input for ${fieldId}`);
      fireEvent.change(input, {
        target: { files: [new File(["%PDF"], name, { type: "application/pdf" })] },
      });
    };

    drop("cv", "cv.pdf");
    drop("job_offer", "offer.pdf");
    await waitFor(() => expect(canvas.getByRole("button", { name: "Run" })).toBeDisabled());

    await userEvent.click(canvas.getByTestId("settle-both"));

    // Both files landed, so the form is complete and Run opens. Without the
    // mirror advancing, `cv` would be gone while its dropzone still showed
    // `cv.pdf`, and the readiness line would be asking for an input that looks
    // answered.
    await waitFor(() => expect(canvas.getByText("cv.pdf")).toBeInTheDocument());
    await expect(canvas.getByText("offer.pdf")).toBeInTheDocument();
    await expect(canvas.queryByText(/still needed/)).not.toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "Run" })).toBeEnabled();
  },
};

/**
 * A rejected submit describes one pipe's inputs, so it dies with that pipe.
 *
 * `commitValues` already clears the summary whenever the panel itself moves the
 * values, on the principle that a stale complaint about a field just corrected
 * is worse than none. Switching pipes is the same principle from the other
 * side: the summary names inputs that are no longer on screen, over a form that
 * was never submitted. The graph integration is exactly this shape — selecting
 * a node swaps the contract under one long-lived panel.
 */
export const SubmitErrorClearedOnPipeSwitch: Story = {
  args: {
    contract: TRIAGE,
    title: "triage_case",
    initialValues: {
      invoice: { amount: "twelve euros", invoice_number: "INV-1" },
      priority: { number: "3" },
      question: { text: "Is this covered?" },
      tags: [],
    },
  },
  render: function Render(args) {
    const [pipe, setPipe] = React.useState({ contract: args.contract, title: args.title });
    return (
      <>
        <PanelHost {...args} contract={pipe.contract} title={pipe.title} />
        <button
          type="button"
          data-testid="switch-pipe"
          onClick={() => setPipe({ contract: CV_SCREENING, title: "cv_screening" })}
        >
          switch to cv_screening
        </button>
      </>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // Readiness passes and the gate still rejects — `amount` holds prose.
    const run = canvas.getByRole("button", { name: "Run" });
    await waitFor(() => expect(run).toBeEnabled());
    await userEvent.click(run);
    await expect(await canvas.findByRole("alert")).toBeInTheDocument();

    // Pick another pipe. The complaint went with the form it was about.
    await userEvent.click(canvas.getByTestId("switch-pipe"));
    await waitFor(() => expect(canvas.queryByRole("alert")).not.toBeInTheDocument());
  },
};

/**
 * A host's `uploadFile` may throw where another would reject, and the form has
 * to survive both the same way.
 *
 * The prop is typed as a plain function returning a promise, so a host is free
 * to write it without `async` — and one that validates before it starts the
 * request (no API key, a file over the size limit, a mime type it will not
 * take) throws SYNCHRONOUSLY. That throw lands before there is a promise to
 * attach the failure cleanup to, so the field marked at drop time is never
 * unmarked: the indicator stays up, the dropzone stays disabled, and Run stays
 * gated until the user abandons the form. Written with `async`, the identical
 * body rejects and cleans up properly — so without the wrapper the panel's
 * behaviour turns on a keyword.
 */
export const UploadFileThrowsSynchronously: Story = {
  args: { contract: CV_SCREENING, title: "cv_screening" },
  render: function Render(args) {
    return <PanelHost {...args} uploadFile={throwingUploadSpy} />;
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The spy is module-level, so a second run against the same module instance
    // — the Storybook UI, HMR, watch mode — would find it already satisfied.
    // `toHaveBeenCalled()` below is the synchronisation point for a NEGATIVE
    // assertion, so a stale call count returns `waitFor` instantly and the
    // assertion passes against a form that is about to wedge. The three gate
    // spies are cleared for the same reason.
    throwingUploadSpy.mockClear();

    const input = canvasElement.querySelector<HTMLInputElement>('input[id="cv"]');
    if (!input) throw new Error("no file input for cv");
    fireEvent.change(input, {
      target: { files: [new File(["%PDF"], "cv.pdf", { type: "application/pdf" })] },
    });

    // Synchronize on the SPY, not on anything rendered. react-dropzone hands
    // the file over in a promise continuation, so at `fireEvent.change` the
    // panel has not seen the drop yet and every assertion about it would pass
    // by looking too early — including, measurably, the one below. The spy runs
    // synchronously inside the drop handler, one line after the field is
    // marked, so once it has fired the marking is committed or about to be.
    await waitFor(() => expect(throwingUploadSpy).toHaveBeenCalled());

    // Announcing the failure is the host's job; leaving the form usable is
    // ours. Unwrapped, this indicator appears and never goes away.
    await waitFor(() => expect(canvas.queryByText(/Uploading/)).not.toBeInTheDocument());

    // And the form is back to its ordinary complaint about a `cv` it does not
    // have, rather than wedged waiting on an upload that already failed.
    await expect(canvas.getByText(/still needed/)).toBeInTheDocument();
  },
};
