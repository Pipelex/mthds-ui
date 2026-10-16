import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import type { Problem } from "mthds/errors";
import type { GraphSpec } from "@graph/types";
import { GRAPH_THEME } from "@graph/types";
import { GraphViewer } from "../GraphViewer";
import { waitForGraphRender } from "./storyTestUtils";

/**
 * A run that failed, as the graph shows it: the pipe the run failed in wears a
 * ring in the error colour, and its detail panel opens on its problem document.
 *
 * The sequence `screen_candidate` ran `extract_cv`, then `score_match`, whose
 * function raised. Both the step and the sequence failed, and both carry the
 * run's problem, located at `score_match` beneath the sequence, so the graph
 * marks the step alone, and the sequence's panel names the step it failed in.
 *
 * No runtime emits a problem document on a graph node yet, so the spec is
 * written here, its problem worded as the core error registry words the code.
 */
const PROBLEM: Problem = {
  type: "https://mthds.ai/errors/pipe.function_raised",
  title: "The method's function raised",
  status: 422,
  detail: "The function 'funcs.score.score_match' of pipe 'score_match' raised an error.",
  code: "pipe.function_raised",
  domain: "method",
  retry: "no",
  next_step: {
    kind: "change_method",
    detail:
      "Fix the function 'funcs.score.score_match' so that it does not raise on these inputs, then run the method again.",
  },
  params: { pipe: "score_match", function: "funcs.score.score_match" },
  location: { pipe: "score_match", path: ["screen_candidate", "score_match"] },
  pipeline_run_id: "run_failed_demo",
};

const FAILED_RUN: GraphSpec = {
  meta: { format: "mthds", mode: "live" },
  pipeline_ref: { domain: "screening", main_pipe: "screen_candidate" },
  nodes: [
    {
      id: "seq",
      kind: "controller",
      status: "failed",
      pipe_code: "screen_candidate",
      pipe_type: "PipeSequence",
      description: "Screen a candidate's CV",
      domain_code: "screening",
      io: { inputs: [], outputs: [] },
      error: PROBLEM,
    },
    {
      id: "extract",
      kind: "operator",
      status: "succeeded",
      pipe_code: "extract_cv",
      pipe_type: "PipeExtract",
      description: "Extract the CV's text",
      domain_code: "screening",
      io: {
        inputs: [{ digest: "d_cv", name: "cv", concept: "Document" }],
        outputs: [{ digest: "d_cv_text", name: "cv_text", concept: "Text" }],
      },
    },
    {
      id: "score",
      kind: "operator",
      status: "failed",
      pipe_code: "score_match",
      pipe_type: "PipeFunc",
      description: "Score the CV against the job offer",
      domain_code: "screening",
      io: { inputs: [{ digest: "d_cv_text", name: "cv_text", concept: "Text" }], outputs: [] },
      error: PROBLEM,
    },
  ],
  edges: [
    { id: "e_seq_extract", source: "seq", target: "extract", kind: "contains" },
    { id: "e_seq_score", source: "seq", target: "score", kind: "contains" },
  ],
};

const meta = {
  title: "Graph/Failed run",
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

const args = {
  graph: { graphSpec: FAILED_RUN },
  initialDirection: "LR" as const,
  initialShowControllers: true,
};

/** The open detail panel. */
async function detailPanel(canvasElement: HTMLElement) {
  const el = await waitFor(() => {
    const found = canvasElement.querySelector<HTMLElement>(".detail-panel-content");
    if (!found) throw new Error("no detail panel");
    return found;
  });
  return within(el);
}

export const Dark: Story = {
  args: { ...args, theme: GRAPH_THEME.DARK },
  play: async ({ canvasElement }) => {
    await waitForGraphRender(canvasElement);

    // Only the step the run failed in is marked: neither the sequence above it,
    // which failed because of it, nor the step that ran.
    const marked = canvasElement.querySelectorAll(".pipe-card--failing-pipe");
    await expect(marked).toHaveLength(1);
    await expect(marked[0]).toHaveTextContent("score_match");
    await expect(canvasElement.querySelector(".controller-group-node--failing-pipe")).toBeNull();

    // Its panel opens on the problem.
    await userEvent.click(marked[0] as HTMLElement);
    const panel = await detailPanel(canvasElement);
    await expect(await panel.findByText("The method's function raised")).toBeInTheDocument();
    await expect(panel.getByText("pipe.function_raised")).toBeInTheDocument();
    await expect(panel.getByText("score_match (this pipe)")).toBeInTheDocument();
    await expect(panel.getByText("screen_candidate › score_match")).toBeInTheDocument();
    await expect(panel.getByText(/Fix the function/)).toBeInTheDocument();
  },
};

export const Light: Story = {
  args: { ...args, theme: GRAPH_THEME.LIGHT },
  play: async ({ canvasElement }) => {
    await waitForGraphRender(canvasElement);
    await expect(canvasElement.querySelectorAll(".pipe-card--failing-pipe")).toHaveLength(1);
  },
};
