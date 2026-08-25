import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { getPipeIOContract, type PipeIOContract } from "@pipelex/mthds-form";
import { RunPanel } from "@form/react/RunPanel";
import { GraphViewer } from "@graph/react/viewer/GraphViewer";
import { GRAPH_THEME, type GraphNodeData } from "@graph/types";
import { DRY_CV_SCREENING } from "@graph/react/viewer/__stories__/pipelines/specs/_generated.dry";
import { CONTRACTS_CV_SCREENING } from "./contracts/_generated.contracts";

/**
 * The K2 gate, in one story: click a pipe in the graph, fill its form, see the
 * payload a run would receive.
 *
 * Both halves come from the SAME method — `data/pipelines/pipeline_09`. The
 * graph is its generated dry-run `GraphSpec`; the forms are its generated
 * `pipe_io_contracts`. The only code between them is the lookup below, which is
 * the kernel's own `getPipeIOContract` — note the argument order
 * (contracts, domain, pipeCode); the kernel's README currently shows it wrong.
 *
 * Nothing here derives what a field IS, whether the form MAY run, or what goes
 * on the wire. That is the whole point: a host wires two props together and
 * gets a working method form.
 */
function GraphAndPanel() {
  const [selection, setSelection] = React.useState<{
    contract: PipeIOContract;
    pipeCode: string;
  } | null>(null);
  const [values, setValues] = React.useState<Record<string, unknown>>({});
  const [payload, setPayload] = React.useState<Record<string, unknown> | null>(null);

  const handleNodeSelect = (_nodeId: string, nodeData: GraphNodeData) => {
    if (!nodeData.isPipe || !nodeData.pipeCode) return;
    const contract = getPipeIOContract(
      CONTRACTS_CV_SCREENING,
      nodeData.nodeData?.domain_code,
      nodeData.pipeCode,
    );
    if (!contract) return;
    // A different pipe asks different questions, so the values do not carry over.
    setSelection({ contract, pipeCode: nodeData.pipeCode });
    setValues({});
    setPayload(null);
  };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100%" }}>
      <div style={{ flex: 1, position: "relative", minWidth: 0 }}>
        <GraphViewer
          graphspec={DRY_CV_SCREENING}
          initialDirection="LR"
          initialShowControllers
          theme={GRAPH_THEME.DARK}
          onNodeSelect={handleNodeSelect}
        />
      </div>
      <div
        style={{
          width: 420,
          flexShrink: 0,
          padding: 16,
          overflowY: "auto",
          borderLeft: "1px solid rgba(255,255,255,0.1)",
        }}
      >
        {selection ? (
          <div style={{ display: "grid", gap: 12 }}>
            <RunPanel
              contract={selection.contract}
              values={values}
              onValuesChange={setValues}
              onRun={setPayload}
              title={selection.pipeCode}
              theme={GRAPH_THEME.DARK}
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
        ) : (
          <p style={{ color: "#94a3b8", font: "13px/1.6 system-ui, sans-serif" }}>
            Select a pipe in the graph to see its input form.
          </p>
        )}
      </div>
    </div>
  );
}

const meta: Meta<typeof GraphAndPanel> = {
  title: "Form/Graph with RunPanel",
  component: GraphAndPanel,
  parameters: { layout: "fullscreen", backgrounds: { default: "dark" } },
};

export default meta;
type Story = StoryObj<typeof GraphAndPanel>;

export const CvScreening: Story = {
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);

    // The panel is empty until a pipe is picked.
    await expect(canvas.getByText(/Select a pipe in the graph/)).toBeInTheDocument();

    // ELK lays the graph out asynchronously, so wait for the nodes.
    await waitFor(
      () => expect(canvasElement.querySelectorAll(".react-flow__node").length).toBeGreaterThan(0),
      { timeout: 10000 },
    );

    // `analyze_candidate` takes a plural `pages` input, so it is runnable with
    // nothing filled in — an empty plural is a legitimate value, not an absence.
    // Node ids are opaque (`<run-uuid>:node_N`), so the card is found by the
    // pipe code it renders.
    const label = await canvas.findByText("analyze_candidate", {}, { timeout: 10000 });
    const card = label.closest(".react-flow__node");
    if (!card) throw new Error("the analyze_candidate label is not inside a ReactFlow node");
    await userEvent.click(card);

    const run = await canvas.findByRole("button", { name: "Run" });
    await userEvent.click(run);

    await waitFor(() => {
      const sent = JSON.parse(canvas.getByTestId("run-payload").textContent ?? "{}") as Record<
        string,
        unknown
      >;
      expect(sent.pages).toEqual([]);
    });
  },
};
