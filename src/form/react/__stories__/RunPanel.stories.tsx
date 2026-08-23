import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { getPipeIOContract, type PipeIOContract } from "@pipelex/mthds-form";
import { RunPanel } from "@form/react/RunPanel";
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
}: {
  contract: PipeIOContract;
  title: string;
  running?: boolean;
  theme?: GraphTheme;
  initialValues?: Record<string, unknown>;
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
