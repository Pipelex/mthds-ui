import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { GraphViewer } from "../GraphViewer";
import { GRAPH_STYLE, GRAPH_THEME } from "@graph/types";
import { LIVE_BATCH_WITH_INNER_SEQ, LIVE_CV_SCREENING, LIVE_EMAIL_TRIAGE } from "./liveGraphSpec";
import { DRY_CV_SCREENING } from "./mockGraphSpec";
import { STATIC_CV_SCREENING } from "./staticGraphSpec";
import { waitForGraphRender } from "./storyTestUtils";
import {
  CONTRACTS_BATCH_WITH_INNER_SEQ,
  CONTRACTS_CV_SCREENING,
  CONTRACTS_EMAIL_TRIAGE,
  INPUT_FORM_BATCH_WITH_INNER_SEQ,
  INPUT_FORM_CV_SCREENING,
  INPUT_FORM_EMAIL_TRIAGE,
  OUTPUT_FORM_BATCH_WITH_INNER_SEQ,
  OUTPUT_FORM_CV_SCREENING,
  OUTPUT_FORM_EMAIL_TRIAGE,
} from "@form/react/__stories__/contracts/_generated.contracts";

/**
 * The simple style's detail panel: what a click on a step, a decision, a
 * repeated group, an input, the result or an arrow opens, in the words the
 * canvas uses (`docs/graph-styles.md`, "The detail panel").
 *
 * Each story is a real run of one corpus pipeline handed over with its
 * descriptors, so a value is drawn by the form kernel's result view as it is in
 * the detailed style. A static graph and a dry run show the same panel without
 * the values they do not have.
 */
const meta = {
  title: "Graph - styles/Simple detail panel",
  component: GraphViewer,
  parameters: { layout: "fullscreen" },
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "100vh", position: "relative" }}>
        <Story />
      </div>
    ),
  ],
} satisfies Meta<typeof GraphViewer>;

export default meta;
type Story = StoryObj<typeof meta>;

const CV_SCREENING = {
  graphSpec: LIVE_CV_SCREENING,
  pipeIoContracts: CONTRACTS_CV_SCREENING,
  inputForm: INPUT_FORM_CV_SCREENING,
  outputForm: OUTPUT_FORM_CV_SCREENING,
};

const base = {
  graphStyle: GRAPH_STYLE.SIMPLE,
  initialDirection: "LR" as const,
  theme: GRAPH_THEME.LIGHT,
};

const ANALYZE_STEP = "Analyze CV to build candidate profile";

/** The canvas node whose own text holds `title`. */
async function nodeTitled(canvasElement: HTMLElement, title: string): Promise<HTMLElement> {
  await waitForGraphRender(canvasElement);
  return waitFor(() => {
    const node = Array.from(canvasElement.querySelectorAll<HTMLElement>(".react-flow__node")).find(
      (n) => n.textContent?.includes(title),
    );
    if (!node) throw new Error(`no node titled ${title}`);
    return node;
  });
}

/** The open detail panel, once it holds the simple style's view. */
async function simplePanel(canvasElement: HTMLElement) {
  const el = await waitFor(() => {
    const found = canvasElement.querySelector<HTMLElement>(".detail-panel-content .simple-detail");
    if (!found) throw new Error("no simple detail panel");
    return found;
  });
  return within(el);
}

/** The panel's title, which names what it is open on. */
async function expectPanelTitle(canvasElement: HTMLElement, title: string) {
  await waitFor(async () => {
    const panel = await simplePanel(canvasElement);
    await expect(panel.getByRole("heading", { level: 2, name: title })).toBeInTheDocument();
  });
}

/**
 * A step of a real run: what it uses and produces, each value with where it
 * comes from or goes, the first value it produced open, the prompt folded, and
 * the detailed panel folded at the bottom.
 */
export const AStep: Story = {
  args: { ...base, graph: CV_SCREENING },
  play: async ({ canvasElement }) => {
    await userEvent.click(await nodeTitled(canvasElement, ANALYZE_STEP));
    await expectPanelTitle(canvasElement, ANALYZE_STEP);
    const panel = await simplePanel(canvasElement);
    await expect(panel.getByRole("heading", { name: "Uses" })).toBeInTheDocument();
    await expect(panel.getByRole("heading", { name: "Produces" })).toBeInTheDocument();
    // The value it produced, drawn by the kernel's result view, open; the
    // values it uses stay folded, and a folded value mounts nothing.
    await waitFor(() => expect(panel.getAllByRole("button", { name: "Result" })).toHaveLength(1));
    const usedValue = panel.getByText("Show the value");
    await userEvent.click(usedValue);
    await waitFor(() => expect(panel.getAllByRole("button", { name: "Result" })).toHaveLength(2));

    // The prompt is folded until asked for.
    const prompt = panel.getByText("What the AI is asked");
    const promptFold = prompt.closest("details");
    await expect(promptFold).not.toHaveAttribute("open");
    await userEvent.click(prompt);
    await expect(promptFold).toHaveAttribute("open");

    // The technical fold mounts the detailed panel only when opened.
    const technical = panel.getByText("Technical details").closest("details")!;
    await expect(technical.querySelector(".simple-detail-technical-body")).toBeNull();
    await userEvent.click(panel.getByText("Technical details"));
    await waitFor(() =>
      expect(technical.querySelector(".simple-detail-technical-body")).not.toBeNull(),
    );
  },
};

/** The same step in the dark theme. */
export const AStepDark: Story = {
  args: { ...base, graph: CV_SCREENING, theme: GRAPH_THEME.DARK },
  play: async ({ canvasElement }) => {
    await userEvent.click(await nodeTitled(canvasElement, ANALYZE_STEP));
    await expectPanelTitle(canvasElement, ANALYZE_STEP);
  },
};

/** A link in the panel opens the node it names, as a click on the canvas would. */
export const ALinkOpensTheNodeItNames: Story = {
  args: { ...base, graph: CV_SCREENING },
  play: async ({ canvasElement }) => {
    await userEvent.click(await nodeTitled(canvasElement, ANALYZE_STEP));
    const panel = await simplePanel(canvasElement);
    // The CV it uses came from the step before it.
    const from = await waitFor(() => {
      const button = panel
        .getAllByRole("button")
        .find((b) => b.classList.contains("simple-link--step"));
      if (!button) throw new Error("no link to a step");
      return button;
    });
    const name = from.textContent ?? "";
    await userEvent.click(from);
    await expectPanelTitle(canvasElement, name);
    // The canvas shows the same node selected.
    const node = await nodeTitled(canvasElement, name);
    await waitFor(() => expect(node).toHaveClass("selected"));
  },
};

/** A static graph ran nothing: no run line, no values, the same words otherwise. */
export const AStepInAStaticGraph: Story = {
  args: { ...base, graph: { graphSpec: STATIC_CV_SCREENING } },
  play: async ({ canvasElement }) => {
    await userEvent.click(await nodeTitled(canvasElement, ANALYZE_STEP));
    await expectPanelTitle(canvasElement, ANALYZE_STEP);
    const el = canvasElement.querySelector(".simple-detail")!;
    await expect(el.querySelector(".simple-detail-run")).toBeNull();
    await expect(el.querySelector(".simple-value-fold")).toBeNull();
    await expect(within(el as HTMLElement).getByText("Produces")).toBeInTheDocument();
  },
};

/** A dry run's values are made up, so the panel says so and shows none. */
export const AStepInADryRun: Story = {
  args: { ...base, graph: { graphSpec: DRY_CV_SCREENING } },
  play: async ({ canvasElement }) => {
    await userEvent.click(await nodeTitled(canvasElement, ANALYZE_STEP));
    const panel = await simplePanel(canvasElement);
    await expect(panel.getByText(/This was a test run/)).toBeInTheDocument();
    await expect(canvasElement.querySelector(".simple-value-fold")).toBeNull();
  },
};

/** A decision: what it reads, its outcomes with where each leads, and which one the run took. */
export const ADecision: Story = {
  args: {
    ...base,
    graph: {
      graphSpec: LIVE_EMAIL_TRIAGE,
      pipeIoContracts: CONTRACTS_EMAIL_TRIAGE,
      inputForm: INPUT_FORM_EMAIL_TRIAGE,
      outputForm: OUTPUT_FORM_EMAIL_TRIAGE,
    },
  },
  play: async ({ canvasElement }) => {
    const title = "Route email based on classification";
    await userEvent.click(await nodeTitled(canvasElement, title));
    await expectPanelTitle(canvasElement, title);
    const panel = await simplePanel(canvasElement);
    await expect(panel.getByRole("heading", { name: "Possible outcomes" })).toBeInTheDocument();
    const el = canvasElement.querySelector(".simple-detail")!;
    await expect(el.querySelectorAll(".simple-detail-outcome--taken").length).toBe(1);
  },
};

/** A repeated group: what it repeats over and the steps it repeats, each a link. */
export const ARepeatedGroup: Story = {
  args: {
    ...base,
    graph: {
      graphSpec: LIVE_BATCH_WITH_INNER_SEQ,
      pipeIoContracts: CONTRACTS_BATCH_WITH_INNER_SEQ,
      inputForm: INPUT_FORM_BATCH_WITH_INNER_SEQ,
      outputForm: OUTPUT_FORM_BATCH_WITH_INNER_SEQ,
    },
  },
  play: async ({ canvasElement }) => {
    await waitForGraphRender(canvasElement);
    const frame = await waitFor(() => {
      const el = canvasElement.querySelector<HTMLElement>(".react-flow__node-simpleFrame");
      if (!el) throw new Error("no frame");
      return el;
    });
    await userEvent.click(frame);
    const panel = await simplePanel(canvasElement);
    await expect(panel.getByRole("heading", { name: "Repeats over" })).toBeInTheDocument();
    await expect(panel.getByRole("heading", { name: "Steps it repeats" })).toBeInTheDocument();
    const first = panel.getAllByRole("listitem")[0]!.querySelector("button")!;
    const name = first.textContent ?? "";
    await userEvent.click(first);
    await expectPanelTitle(canvasElement, name);
  },
};

/** The method's input and its result, each with the steps on the other side. */
export const AnInputAndTheResult: Story = {
  args: { ...base, graph: CV_SCREENING },
  play: async ({ canvasElement }) => {
    await waitForGraphRender(canvasElement);
    const terminals = await waitFor(() => {
      const found = canvasElement.querySelectorAll<HTMLElement>(".react-flow__node-simpleTerminal");
      if (found.length < 2) throw new Error("no terminals");
      return Array.from(found);
    });
    await userEvent.click(terminals[0]!);
    let panel = await simplePanel(canvasElement);
    await expect(panel.getByText("Input")).toBeInTheDocument();
    await expect(panel.getByRole("heading", { name: "Read by" })).toBeInTheDocument();

    await userEvent.click(terminals[terminals.length - 1]!);
    await waitFor(async () => {
      panel = await simplePanel(canvasElement);
      await expect(panel.getByRole("heading", { name: "Made by" })).toBeInTheDocument();
    });
    await expect(
      panel.getByText("Result", { selector: ".simple-detail-kind" }),
    ).toBeInTheDocument();
  },
};

/** An arrow opens the values it carries; a second click closes it, as a node's does. */
export const AnArrow: Story = {
  args: { ...base, graph: CV_SCREENING },
  play: async ({ canvasElement }) => {
    await waitForGraphRender(canvasElement);
    const edge = await waitFor(() => {
      const el = canvasElement.querySelector<SVGGElement>(".react-flow__edge-routed");
      if (!el) throw new Error("no arrow");
      return el;
    });
    const hit = edge.querySelector(".react-flow__edge-interaction") ?? edge;
    await userEvent.click(hit);
    const panel = await simplePanel(canvasElement);
    await expect(panel.getByText("Passed along")).toBeInTheDocument();
    await expect(panel.getByRole("heading", { name: "What it carries" })).toBeInTheDocument();
    await waitFor(() => expect(edge).toHaveClass("selected"));

    await userEvent.click(hit);
    await waitFor(() => expect(canvasElement.querySelector(".simple-detail")).toBeNull());
    await waitFor(() => expect(edge).not.toHaveClass("selected"));
  },
};

/** The detailed style draws values as nodes, so a click on one of its arrows opens nothing. */
export const DetailedStyleArrowsOpenNothing: Story = {
  args: { ...base, graphStyle: GRAPH_STYLE.DETAILED, graph: CV_SCREENING },
  play: async ({ canvasElement }) => {
    await waitForGraphRender(canvasElement);
    const edge = await waitFor(() => {
      const el = canvasElement.querySelector<SVGGElement>(".react-flow__edge");
      if (!el) throw new Error("no edge");
      return el;
    });
    await userEvent.click(edge.querySelector(".react-flow__edge-interaction") ?? edge);
    // Give a panel the time it would take to open, then check none did.
    await new Promise((resolve) => setTimeout(resolve, 300));
    await expect(canvasElement.querySelector(".detail-panel")).toHaveClass("detail-panel--closed");
  },
};
