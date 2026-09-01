import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { GraphViewer } from "../GraphViewer";
import { GRAPH_THEME } from "@graph/types";
import { LIVE_CV_SCREENING } from "./pipelines/specs/_generated.live";
import {
  CONTRACTS_CV_SCREENING,
  INPUT_FORM_CV_SCREENING,
  OUTPUT_FORM_CV_SCREENING,
} from "@form/react/__stories__/contracts/_generated.contracts";

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
 * The whole wiring is the artifacts themselves:
 *
 *     <GraphViewer graphspec={spec} contracts={…} outputForm={…} inputForm={…} />
 *
 * The graph owns the selection, the lookup and the panel, and renders the result
 * itself — there is no render prop any more, because the form kernel stopped
 * being an optional peer when this became how the viewer shows data at all. A
 * method's own INPUTS have no producing pipe, so they resolve through the third
 * artifact instead: the CONSUMING pipe's `input_form` entry for the slot they
 * arrive in describes the same field from the other side.
 */
const meta = {
  title: "Graph/Result panel",
  component: GraphViewer,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof GraphViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

const args = {
  graphspec: LIVE_CV_SCREENING,
  initialDirection: "LR" as const,
  initialShowControllers: true,
  contracts: CONTRACTS_CV_SCREENING,
  inputForm: INPUT_FORM_CV_SCREENING,
  outputForm: OUTPUT_FORM_CV_SCREENING,
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
 * The same graph with no artifacts — what a consumer holding a spec but not its
 * validate report sees (a static graph, a run restored without one).
 *
 * Structure and no data tab, rather than an empty pane or a JSON dump. That is
 * the deliberate floor: the graph knows a concept's shape from the spec it was
 * given, and it does not pretend to know how to display a value it cannot
 * describe.
 */
/**
 * A method's own INPUT — the top of the graph, which no pipe produced.
 *
 * No `output_form` entry describes it, so the panel falls back to the CONSUMING
 * pipe's `input_form` entry for the slot it arrives in: the same field, seen
 * from the other side. It reads as `cv` rather than `output`, because that is
 * what the method calls it.
 */
export const AMethodInput: Story = {
  args,
  play: async ({ canvasElement }) => {
    await waitFor(
      () => expect(canvasElement.querySelectorAll(".react-flow__node").length).toBeGreaterThan(0),
      { timeout: 10000 },
    );
    // The `cv` Document is the method's own input in pipeline_09.
    const nodes = Array.from(canvasElement.querySelectorAll<HTMLElement>(".react-flow__node"));
    const input = nodes.find(
      (n) => n.textContent?.startsWith("cv") && n.dataset.id?.includes("stuff_"),
    );
    await expect(input).toBeDefined();
    await userEvent.click(input!);
    // Scoped to the DETAIL PANEL, not the canvas: `cv` also labels the graph
    // node and the consuming pipe card's input pill, so an unscoped query
    // matches three elements and says nothing about which one rendered.
    const panel = within(
      await waitFor(() => {
        const el = canvasElement.querySelector<HTMLElement>(".detail-panel-content");
        if (!el) throw new Error("no detail panel");
        return el;
      }),
    );
    // Labelled by its SLOT name, which is the INPUT descriptor's - the producer
    // path would have called it `output`, so this is what proves the fallback
    // fired rather than that something merely rendered.
    await waitFor(() => expect(panel.getByText("cv")).toBeInTheDocument());
    await expect(panel.getByRole("button", { name: "Result" })).toBeInTheDocument();
  },
};

export const WithoutArtifacts: Story = {
  args: { graphspec: LIVE_CV_SCREENING, initialDirection: "LR", theme: GRAPH_THEME.LIGHT },
  play: async ({ canvasElement }) => {
    await openFirstStuffNode(canvasElement);
    const canvas = within(canvasElement);
    await waitFor(() => expect(canvas.getByText("Structure")).toBeInTheDocument());
    await expect(canvas.queryByRole("tab", { name: "Data" })).toBeNull();
  },
};
