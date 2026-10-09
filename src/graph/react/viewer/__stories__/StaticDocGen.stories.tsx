import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";

import { buildStaticGraphSpecFromToml } from "@static-graph/buildStaticGraphSpec";
import { GraphViewer } from "../GraphViewer";

// An entry of the vendored MTHDS Test Corpus, built by the static builder with
// no pipelex run: one PipeDocGen step laying a shop's opening hours out as a pdf
// with no template, its file name a template over its input.
import doorNoticeBundle from "../../../../../data/mthds-corpus/entries/operator_doc_gen_door_notice/bundle.mthds?raw";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph - static/Valid/Document step",
  component: GraphViewer,
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "100vh", position: "relative" }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    initialDirection: { control: { type: "inline-radio" }, options: ["LR", "TB"] },
    initialShowControllers: { control: { type: "boolean" } },
  },
};

export default meta;
type Story = StoryObj<typeof GraphViewer>;

const GRAPH = { graphSpec: buildStaticGraphSpecFromToml(doorNoticeBundle).spec };

/** The key/value rows of the open detail panel. */
async function detailRows(canvasElement: HTMLElement): Promise<(string | null | undefined)[][]> {
  const panel = await waitFor(() => {
    const el = canvasElement.querySelector<HTMLElement>(".detail-panel-content");
    if (!el) throw new Error("no detail panel");
    return el;
  });
  return Array.from(panel.querySelectorAll(".detail-kv-row")).map((row) => [
    row.querySelector(".detail-kv-key")?.textContent,
    row.querySelector(".detail-kv-value")?.textContent,
  ]);
}

/**
 * The card names the format beside its badge, and its detail panel says what
 * the step prints, on which engine, from what, under which name.
 */
async function playDocGenStep({ canvasElement }: { canvasElement: HTMLElement }) {
  const card = await waitFor(
    () => {
      const el = canvasElement.querySelector<HTMLElement>(".pipe-card");
      if (!el?.textContent?.includes("print_notice")) throw new Error("no print_notice card");
      return el;
    },
    { timeout: 10000 },
  );
  const chip = within(card).getByText("PDF");
  await expect(chip).toHaveClass("pipe-card-format");
  await expect(chip).toHaveAttribute("title", "Document format: pdf");

  await userEvent.click(card);
  await waitFor(async () => {
    const rows = await detailRows(canvasElement);
    await expect(rows).toContainEqual(["Format", "PDF"]);
    await expect(rows).toContainEqual(["Engine", "deck default"]);
    await expect(rows).toContainEqual(["Source", "auto-layout"]);
    await expect(rows).toContainEqual(["File Name", "notice-{{ notice.shop_name }}"]);
  });
}

/** Corpus entry `operator_doc_gen_door_notice`, left to right. */
export const DoorNotice: Story = {
  args: { graph: GRAPH, initialDirection: "LR", initialShowControllers: true },
  play: playDocGenStep,
};

/** The same, top to bottom, where the chip shares the header's row with the pipe code. */
export const DoorNoticeTopToBottom: Story = {
  args: { graph: GRAPH, initialDirection: "TB", initialShowControllers: true },
  play: playDocGenStep,
};
