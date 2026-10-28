import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { RunTimeline } from "../RunTimeline";
import { SnapshotReplay } from "./SnapshotReplay";
import { REVIEW_FILINGS_REGISTRY, VET_COMPANY_REGISTRY } from "./methodRegistries";
import {
  REVIEW_FILINGS_SNAPSHOTS,
  VET_COMPANY_SNAPSHOTS,
  WIDE_BATCH_SNAPSHOTS,
  WORKED_EXAMPLE_SNAPSHOT,
} from "./recordedRuns";

/**
 * The run timeline in its simple style: the run as a checklist of its steps in
 * the method's own words, for a reader who did not write the method. The
 * stories hand it the registry of the method each recording ran, as a host
 * holding the method's graph would.
 */
const meta: Meta<typeof RunTimeline> = {
  title: "Timeline/RunTimeline/Simple",
  component: RunTimeline,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 720, padding: 16, fontFamily: "sans-serif" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    theme: "dark",
    timelineStyle: "simple",
    pipeRegistry: REVIEW_FILINGS_REGISTRY,
    entryPipeRef: "filings.review_filings",
  },
};

export default meta;
type Story = StoryObj<typeof RunTimeline>;

const ROOT = "filings.review_filings";
const BATCH = `${ROOT}/step_3`;

function lineAt(canvasElement: HTMLElement, key: string): HTMLElement | null {
  return canvasElement.querySelector<HTMLElement>(`li[data-key="${key}"]`);
}

function headlineOf(canvasElement: HTMLElement): string {
  return canvasElement.querySelector('[data-testid="run-timeline-status"]')?.textContent ?? "";
}

/** The worked example, replayed in the simple style. */
export const RecordedRun: Story = {
  render: (args) => (
    <SnapshotReplay
      snapshots={REVIEW_FILINGS_SNAPSHOTS}
      autoplay
      initialSpeed={5}
      theme={args.theme}
      timelineStyle="simple"
      pipeRegistry={REVIEW_FILINGS_REGISTRY}
      entryPipeRef={ROOT}
    />
  ),
};

/**
 * The contract's worked example mid-run: the steps that ended, the condition's
 * outcome, the batch as one line with its bar and counts and its trouble as
 * notes, and the step the run has not reached yet.
 */
export const WorkedExample: Story = {
  args: { snapshot: WORKED_EXAMPLE_SNAPSHOT, live: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(headlineOf(canvasElement)).toMatch(/^Working on it/));
    await expect(canvas.getByText("Extract the filings from the document")).toBeInTheDocument();
    expect(lineAt(canvasElement, `${ROOT}/step_2`)?.textContent).toContain("→ Detailed");
    const batch = lineAt(canvasElement, BATCH);
    expect(batch?.textContent).toContain("Summarize a filing");
    expect(batch?.textContent).toContain("for each filing");
    expect(batch?.textContent).toContain("1 of 3 done · 2 in progress");
    expect(batch?.textContent).toContain("Having trouble with 1 filing");
    expect(canvas.getByRole("progressbar")).toHaveAttribute("aria-valuenow", "1");
    // The step the run has not reached, named from the registry.
    expect(lineAt(canvasElement, `${ROOT}/step_4`)?.dataset.state).toBe("upcoming");
    // Never a line per item.
    expect(canvasElement.querySelector(`li[data-key="${BATCH}/item_1"]`)).toBeNull();
  },
};

/**
 * The batch opened: its branch's steps, each counted across the items, and the
 * one an item is trying again.
 */
export const WorkedExampleBatchOpened: Story = {
  args: { snapshot: WORKED_EXAMPLE_SNAPSHOT, live: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const toggle = await canvas.findByRole("button", {
      name: /Show the steps of Summarize a filing/,
    });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(toggle);
    await waitFor(() => expect(lineAt(canvasElement, `${BATCH}/*/step_1`)).toBeInTheDocument());
    expect(lineAt(canvasElement, `${BATCH}/*/step_2`)?.textContent).toContain(
      "Trying again for 1 filing",
    );
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    await userEvent.click(toggle);
    await waitFor(() => expect(lineAt(canvasElement, `${BATCH}/*/step_1`)).toBeNull());
  },
};

/** The worked example in the light theme. */
export const WorkedExampleLight: Story = {
  args: { snapshot: WORKED_EXAMPLE_SNAPSHOT, live: false, theme: "light" },
  decorators: [
    (Story) => (
      <div style={{ background: "#f1f5f9", padding: 16 }}>
        <Story />
      </div>
    ),
  ],
};

/** The worked example in a narrow container, below the 560-pixel breakpoint. */
export const WorkedExampleNarrow: Story = {
  args: { snapshot: WORKED_EXAMPLE_SNAPSHOT, live: false },
  decorators: [
    (Story) => (
      <div style={{ width: 360 }}>
        <Story />
      </div>
    ),
  ],
};

/** A batch over twenty-four filings, replayed: one line, its bar filling. */
export const WideBatch: Story = {
  render: (args) => (
    <SnapshotReplay
      snapshots={WIDE_BATCH_SNAPSHOTS}
      autoplay
      initialSpeed={2}
      theme={args.theme}
      timelineStyle="simple"
      pipeRegistry={REVIEW_FILINGS_REGISTRY}
      entryPipeRef={ROOT}
    />
  ),
};

/** The wide batch's run once it failed: where it failed, and the problem, in words. */
export const WideBatchFailed: Story = {
  args: { snapshot: WIDE_BATCH_SNAPSHOTS[WIDE_BATCH_SNAPSHOTS.length - 1] },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(headlineOf(canvasElement)).toMatch(/^Failed in Summarize a filing/));
    expect(lineAt(canvasElement, BATCH)?.textContent).toContain("23 of 24 done · 1 failed");
  },
};

/** Before anything started: the steps the run will take, from the registry. */
export const WaitingToStart: Story = {
  args: { snapshot: REVIEW_FILINGS_SNAPSHOTS[0] },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(headlineOf(canvasElement)).toBe("Waiting to start"));
    const lines = canvasElement.querySelectorAll('li[data-state="upcoming"]');
    expect(lines).toHaveLength(4);
  },
};

/**
 * The worked example with no registry: every line titled by its humanized pipe
 * code, a batch's item named "item", and no upcoming line.
 */
export const NoRegistry: Story = {
  args: {
    snapshot: WORKED_EXAMPLE_SNAPSHOT,
    live: false,
    pipeRegistry: undefined,
    entryPipeRef: undefined,
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Extract filings")).toBeInTheDocument();
    expect(lineAt(canvasElement, BATCH)?.textContent).toContain("for each item");
    expect(canvasElement.querySelector('li[data-state="upcoming"]')).toBeNull();
  },
};

/** A method with a wide parallel and deep nesting, replayed. */
export const VetCompany: Story = {
  render: (args) => (
    <SnapshotReplay
      snapshots={VET_COMPANY_SNAPSHOTS}
      autoplay
      initialSpeed={2}
      theme={args.theme}
      timelineStyle="simple"
      pipeRegistry={VET_COMPANY_REGISTRY}
      entryPipeRef="diligence.vet_company"
    />
  ),
};
