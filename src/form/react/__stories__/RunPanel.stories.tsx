import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fireEvent, userEvent, waitFor, within } from "storybook/test";
import { getPipeIOContract, type PipeIOContract } from "@pipelex/mthds-form";
import type { FieldEnv } from "@pipelex/mthds-form/react";
import { RunPanel, type UploadedFile } from "@form/react/RunPanel";
import { GRAPH_THEME, type GraphTheme } from "@graph/types";
import {
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
}: {
  contract: PipeIOContract;
  title: string;
  running?: boolean;
  theme?: GraphTheme;
  initialValues?: Record<string, unknown>;
  env?: FieldEnv;
  uploadFile?: (file: File, fieldId: string) => Promise<UploadedFile>;
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

    // The optional input is folded until asked for.
    await expect(canvas.queryByLabelText(/style_hint/i)).not.toBeInTheDocument();
    await userEvent.click(canvas.getByRole("button", { name: /optional input/i }));
    await expect(canvas.getByLabelText(/style_hint/i)).toBeInTheDocument();

    // Filling the required input flips readiness.
    await userEvent.type(canvas.getByLabelText(/subject/i), "Bridge closure");
    await waitFor(() => expect(run).toBeEnabled());

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
