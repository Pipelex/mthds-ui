import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { FOLD_MODE, GRAPH_THEME, type GraphSpec, type GraphSpecNode } from "@graph/types";
import { makeCycleSpec, makeFailedRunSpec, makeMinimalSpec } from "@graph/__tests__/testUtils";
import { GraphViewer } from "../GraphViewer";
import { GRAPH_ERROR_STATE_TITLE } from "../GraphErrorState";
import { waitForGraphRender } from "./storyTestUtils";

/**
 * What `GraphViewer` draws when it cannot draw the spec it was given: an alert
 * in place of the graph, naming what was refused, while the host's page around
 * it stays up. Each story's host draws a header outside the viewer, and its
 * play test checks the header survived.
 */

/** A spec whose second pipe is of a class this viewer does not know. */
function unknownPipeTypeSpec(): GraphSpec {
  const spec = makeMinimalSpec(3);
  (spec.nodes[1] as { pipe_type: string }).pipe_type = "PipeTeleport";
  return spec;
}

/**
 * A failed run as a runtime predating the problem document writes it: every
 * failed node's `error` is `{ error_type, message, stack, caller_facing }`.
 */
function legacyErrorSpec(): GraphSpec {
  const spec = makeFailedRunSpec();
  for (const node of spec.nodes) {
    if (node.status !== "failed") continue;
    (node as { error: unknown }).error = {
      error_type: "PipeRunError",
      message: "The function raised an error.",
      stack: "Traceback (most recent call last): …",
      caller_facing: false,
    };
  }
  return spec;
}

/**
 * A spec every node and edge of which the validator accepts, but whose shape it
 * does not check: a binding step that "contains" a pipe. Folding it, as the
 * folded mode does on arrival, trips the build's own guard, which throws.
 */
function unbuildableSpec(): GraphSpec {
  const binding: GraphSpecNode = {
    id: "bind",
    kind: "binding",
    status: "succeeded",
    pipe_code: "invoice.total",
    pipe_type: "BindingStep",
    description: "Bind the invoice's total",
    domain_code: "billing",
    io: { inputs: [], outputs: [] },
  };
  const spec = makeMinimalSpec(1);
  spec.nodes.push(binding);
  spec.edges.push({ id: "e_bind_op", source: "bind", target: "op0", kind: "contains" });
  return spec;
}

const UNKNOWN_PIPE_TYPE = unknownPipeTypeSpec();
const LEGACY_ERROR = legacyErrorSpec();
const UNBUILDABLE = unbuildableSpec();
const CONTAINMENT_CYCLE = makeCycleSpec();
const VALID = makeMinimalSpec(3);

const HOST_CHROME = "Host page";

/** The page around the viewer: a header, then the viewer's sized area. */
function HostPage({ width, children }: { width?: number; children: React.ReactNode }) {
  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh", width }}>
      <header style={{ padding: 8, fontFamily: "sans-serif" }}>{HOST_CHROME}</header>
      <div style={{ flex: 1, position: "relative" }}>{children}</div>
    </div>
  );
}

const meta = {
  title: "Graph/Error state",
  component: GraphViewer,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story, { parameters }) => (
      <HostPage width={parameters.hostWidth as number | undefined}>
        <Story />
      </HostPage>
    ),
  ],
} satisfies Meta<typeof GraphViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

/** The error state, once it is drawn, and the host's page still around it. */
async function errorState(canvasElement: HTMLElement): Promise<HTMLElement> {
  const canvas = within(canvasElement);
  const alert = await canvas.findByRole("alert");
  await expect(alert).toHaveTextContent(GRAPH_ERROR_STATE_TITLE);
  await expect(canvas.getByText(HOST_CHROME)).toBeInTheDocument();
  await expect(canvasElement.querySelector(".react-flow__node")).toBeNull();
  return alert;
}

/** A pipe class the viewer does not know, from a runtime newer than it. */
export const UnknownPipeType: Story = {
  args: { graph: { graphSpec: UNKNOWN_PIPE_TYPE }, theme: GRAPH_THEME.DARK },
  play: async ({ canvasElement }) => {
    const alert = await errorState(canvasElement);
    await expect(alert).toHaveTextContent(
      'GraphSpec validation failed at nodes[1].pipe_type: unrecognized pipe class "PipeTeleport"',
    );
  },
};

/** A failed node whose `error` is no problem document, from a runtime older than the viewer. */
export const LegacyNodeError: Story = {
  args: { graph: { graphSpec: LEGACY_ERROR }, theme: GRAPH_THEME.LIGHT },
  play: async ({ canvasElement }) => {
    const alert = await errorState(canvasElement);
    await expect(alert).toHaveTextContent(
      "GraphSpec validation failed at nodes[0].error.type: expected a string, got undefined",
    );
    await expect(canvasElement.querySelector(".react-flow-container--theme-light")).not.toBeNull();
  },
};

/** The still presentation: the error state flows at its message's height, and is not inert. */
export const Still: Story = {
  args: { graph: { graphSpec: UNKNOWN_PIPE_TYPE }, interactive: false },
  play: async ({ canvasElement }) => {
    await errorState(canvasElement);
    const container = canvasElement.querySelector<HTMLElement>(".react-flow-container");
    await expect(container).not.toHaveAttribute("inert");
    await expect(container?.style.height).toBe("");
  },
};

/** At phone width the message wraps, and nothing scrolls sideways. */
export const PhoneWidth: Story = {
  args: { graph: { graphSpec: LEGACY_ERROR } },
  parameters: { hostWidth: 360 },
  play: async ({ canvasElement }) => {
    const alert = await errorState(canvasElement);
    const container = canvasElement.querySelector<HTMLElement>(".react-flow-container");
    await expect(container).not.toBeNull();
    await expect(container!.scrollWidth).toBeLessThanOrEqual(container!.clientWidth);
    await expect(alert.scrollWidth).toBeLessThanOrEqual(alert.clientWidth);
  },
};

/**
 * A spec the validator accepts and the build refuses, from inside an effect:
 * the boundary around the canvas draws the same error state.
 */
export const BuildFailure: Story = {
  args: { graph: { graphSpec: UNBUILDABLE }, initialFoldMode: FOLD_MODE.FOLDED },
  play: async ({ canvasElement }) => {
    const alert = await errorState(canvasElement);
    await expect(alert).toHaveTextContent('expected a pipe-call node ("controller" or "operator")');
  },
};

/**
 * A spec the validator accepts and the layout refuses, asynchronously: a
 * containment cycle, which the layout engine cannot place. The canvas reports
 * the failure, and the error state replaces the blank canvas it used to leave.
 */
export const LayoutFailure: Story = {
  args: { graph: { graphSpec: CONTAINMENT_CYCLE }, initialShowControllers: true },
  play: async ({ canvasElement }) => {
    const alert = await errorState(canvasElement);
    const detail = alert.querySelector(".graph-error-state-detail");
    await expect(detail?.textContent?.trim()).not.toBe("");
  },
};

const SWITCHABLE_SPECS = {
  refused: { label: "A refused spec", spec: UNKNOWN_PIPE_TYPE },
  unbuildable: { label: "A spec that fails to build", spec: UNBUILDABLE },
  valid: { label: "A valid spec", spec: VALID },
} as const;
type SwitchableSpec = keyof typeof SWITCHABLE_SPECS;

/** A host that passes one spec after another, as a live run's updates do. */
function SwitchingHost() {
  const [current, setCurrent] = React.useState<SwitchableSpec>("refused");
  return (
    <>
      <div role="toolbar" aria-label="Spec" style={{ display: "flex", gap: 8, padding: 8 }}>
        {(Object.keys(SWITCHABLE_SPECS) as SwitchableSpec[]).map((key) => (
          <button key={key} type="button" onClick={() => setCurrent(key)}>
            {SWITCHABLE_SPECS[key].label}
          </button>
        ))}
      </div>
      <div style={{ position: "absolute", inset: "48px 0 0 0" }}>
        <GraphViewer
          graph={{ graphSpec: SWITCHABLE_SPECS[current].spec }}
          initialFoldMode={FOLD_MODE.FOLDED}
        />
      </div>
    </>
  );
}

/** A new spec clears the error state, whichever path drew it, and the next one fails afresh. */
export const RecoversOnNewSpec: Story = {
  args: { graph: null },
  render: () => <SwitchingHost />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const show = (key: SwitchableSpec) =>
      userEvent.click(canvas.getByRole("button", { name: SWITCHABLE_SPECS[key].label }));

    await errorState(canvasElement);

    await show("valid");
    await waitForGraphRender(canvasElement);
    await expect(canvas.queryByRole("alert")).toBeNull();

    await show("unbuildable");
    await errorState(canvasElement);

    await show("valid");
    await waitForGraphRender(canvasElement);
    await expect(canvas.queryByRole("alert")).toBeNull();

    await show("refused");
    await waitFor(() => expect(canvas.getByRole("alert")).toBeInTheDocument());
  },
};
