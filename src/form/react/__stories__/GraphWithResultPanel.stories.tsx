import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { renderStuffResult } from "@form/react/StuffResultPanel";
import { GraphViewer } from "@graph/react/viewer/GraphViewer";
import { GRAPH_THEME } from "@graph/types";
import { LIVE_CV_SCREENING } from "@graph/react/viewer/__stories__/pipelines/specs/_generated.live";
import { CONTRACTS_CV_SCREENING, OUTPUT_FORM_CV_SCREENING } from "./contracts/_generated.contracts";

/**
 * Click a data node in the graph, read what the run produced — laid out from the
 * standard's own artifacts.
 *
 * This is the story that replaced `StuffViewer`, and the difference is worth
 * seeing rather than reading about. The old panel offered three tabs (HTML,
 * JSON, Pretty) because a `GraphSpec` states a concept and a payload and nothing
 * about what that payload IS, so guessing three times was the only honest thing
 * left to do. Here the layout is DERIVED: a list of uniform records becomes a
 * table, a structure becomes a two-column grid, prose gets the width it needs, a
 * date is formatted as a date. Nothing inspects the value to decide.
 *
 * Everything on this page came out of the same method, `data/pipelines/
 * pipeline_09`. The graph is its LIVE `GraphSpec` — a real run, so the payloads
 * on its stuff nodes are what the models actually returned — and the artifacts
 * are its generated `pipe_io_contracts` and `output_form`, the views one
 * `/validate` call returns together.
 *
 * The whole wiring is one prop:
 *
 *     renderStuffData={renderStuffResult({ contracts, outputForm })}
 *
 * The graph owns the selection, the lookup and the panel; it hands the renderer
 * the producing pipe's `pipe_ref` and lets the kernel do the rest. Select a
 * method INPUT instead of a produced one and the panel shows the concept's
 * structure alone — correctly, because no pipe produced it, so no output
 * descriptor describes it.
 */
const meta = {
  title: "Form/Graph with ResultPanel",
  component: GraphViewer,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof GraphViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = {
  graphspec: LIVE_CV_SCREENING,
  initialDirection: "LR" as const,
  initialShowControllers: true,
  renderStuffData: renderStuffResult({
    contracts: CONTRACTS_CV_SCREENING,
    outputForm: OUTPUT_FORM_CV_SCREENING,
  }),
};

/** Pick the first data node the layout produced and open its detail panel. */
async function openFirstStuffNode(canvasElement: HTMLElement) {
  await waitFor(
    () => expect(canvasElement.querySelectorAll(".react-flow__node").length).toBeGreaterThan(0),
    { timeout: 10000 },
  );
  // Stuff nodes carry the digest convention in their id, which is what makes
  // them findable without depending on any label the run happened to produce.
  const stuff = canvasElement.querySelector<HTMLElement>('.react-flow__node[data-id*="stuff_"]');
  await expect(stuff).not.toBeNull();
  await userEvent.click(stuff!);
}

export const Light: Story = {
  args: { ...args, theme: GRAPH_THEME.LIGHT },
  play: async ({ canvasElement }) => {
    await openFirstStuffNode(canvasElement);
    const canvas = within(canvasElement);
    // The panel opened on the DATA view, and it is the kernel's - the Result /
    // JSON switch is `ResultPanel`'s, and no other component in this repo has
    // one. Asserting on it rather than on a value is deliberate: the payload
    // came from a live model and is not stable, but the fact that a descriptor
    // drove the layout is.
    await waitFor(() => expect(canvas.getByRole("tab", { name: "Data" })).toBeInTheDocument());
    await expect(canvas.getByRole("button", { name: "Result" })).toBeInTheDocument();
    await expect(canvas.getByRole("button", { name: "JSON" })).toBeInTheDocument();
  },
};

export const Dark: Story = {
  args: { ...args, theme: GRAPH_THEME.DARK },
  play: async ({ canvasElement }) => {
    await openFirstStuffNode(canvasElement);
  },
};

/**
 * The same graph with no renderer wired — what a consumer that has not installed
 * the form kernel, or has not got the artifacts, sees.
 *
 * Structure and no data tab, rather than an empty pane or a JSON dump. That is
 * the deliberate floor: the graph knows a concept's shape from the spec it was
 * given, and it does not pretend to know how to display a value it cannot
 * describe.
 */
export const WithoutARenderer: Story = {
  args: { graphspec: LIVE_CV_SCREENING, initialDirection: "LR", theme: GRAPH_THEME.LIGHT },
  play: async ({ canvasElement }) => {
    await openFirstStuffNode(canvasElement);
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText("Structure")).toBeInTheDocument());
    await expect(canvas.queryByRole("tab", { name: "Data" })).toBeNull();
  },
};
