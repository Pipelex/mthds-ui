import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import { RunTimeline } from "../RunTimeline";
import { SnapshotReplay } from "./SnapshotReplay";
import { REVIEW_FILINGS_REGISTRY, VET_COMPANY_REGISTRY } from "./methodRegistries";
import type { ProgressSnapshot } from "@timeline/progressSnapshot";
import {
  CANCELED_RUN_SNAPSHOT,
  DRY_RUN_SNAPSHOTS,
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
const VET_ROOT = "diligence.vet_company";
const HOST_SUCCESS_COLOR = "rgb(22, 163, 74)";

/** The last of a recording's snapshots read at or before a clock time of its day. */
function snapshotAt(snapshots: ProgressSnapshot[], clock: string): ProgressSnapshot {
  const found = [...snapshots].reverse().find((each) => each.assembled_at.slice(11) <= clock);
  if (!found) throw new Error(`no snapshot at ${clock}`);
  return found;
}

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

/**
 * The wide batch's run once it failed: where it failed, the problem in words,
 * counts that add up to the total, with the skipped filing counted apart, and
 * the step the run never reached.
 */
export const WideBatchFailed: Story = {
  args: { snapshot: WIDE_BATCH_SNAPSHOTS[WIDE_BATCH_SNAPSHOTS.length - 1] },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(headlineOf(canvasElement)).toMatch(/^Failed in Summarize a filing/));
    expect(lineAt(canvasElement, BATCH)?.textContent).toContain(
      "22 of 24 done · 1 failed · 1 skipped",
    );
    const report = lineAt(canvasElement, `${ROOT}/step_4`);
    expect(report?.dataset.state).toBe("notRun");
    expect(report?.textContent).toContain("Not run");
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

/** A canceled run: what was going stops where it was, and the steps past it read as never run. */
export const CanceledRun: Story = {
  args: { snapshot: CANCELED_RUN_SNAPSHOT },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(headlineOf(canvasElement)).toMatch(/^Canceled/));
    expect(lineAt(canvasElement, BATCH)?.dataset.state).toBe("stopped");
    expect(lineAt(canvasElement, BATCH)?.textContent).toContain("Stopped");
    expect(canvasElement.querySelector('li[data-state="upcoming"]')).toBeNull();
    expect(lineAt(canvasElement, `${ROOT}/step_4`)?.dataset.state).toBe("notRun");
  },
};

/** A run that failed before anything started. */
export const FailedBeforeStarting: Story = {
  args: {
    snapshot: { ...REVIEW_FILINGS_SNAPSHOTS[0], status: "failed", summary: "Failed" },
  },
  play: async ({ canvasElement }) => {
    await waitFor(() => expect(headlineOf(canvasElement)).toBe("No progress was recorded"));
    expect(canvasElement.querySelector("li")).toBeNull();
  },
};

/**
 * A dry run, its condition opened: a dry run resolves nothing and runs every
 * branch, so each is labelled by the outcome it stands for.
 */
export const DryRunCondition: Story = {
  args: { snapshot: DRY_RUN_SNAPSHOTS[DRY_RUN_SNAPSHOTS.length - 1] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(await canvas.findByText("Dry run")).toBeInTheDocument();
    await userEvent.click(
      canvas.getByRole("button", { name: "Show the steps of Decide how deep to check" }),
    );
    await waitFor(() =>
      expect(lineAt(canvasElement, `${ROOT}/step_2`)?.textContent).toContain("if Detailed"),
    );
    expect(lineAt(canvasElement, `${ROOT}/step_2`)?.textContent).toContain("if Quick");
  },
};

/** A host's colour for success, through `paletteColors`, on the done marks. */
export const PaletteOverride: Story = {
  args: {
    snapshot: WORKED_EXAMPLE_SNAPSHOT,
    live: false,
    paletteColors: { "--color-success": HOST_SUCCESS_COLOR },
  },
  play: async ({ canvasElement }) => {
    const mark = lineAt(canvasElement, `${ROOT}/step_1`)?.querySelector(
      ".mthds-simple-progress-mark",
    );
    if (!mark) throw new Error("no mark drawn for step 1");
    await waitFor(() => expect(getComputedStyle(mark).color).toBe(HOST_SUCCESS_COLOR));
  },
};

/** The wide batch's failure opened: the problem moves to the step that failed. */
export const WideBatchFailedOpened: Story = {
  args: { snapshot: WIDE_BATCH_SNAPSHOTS[WIDE_BATCH_SNAPSHOTS.length - 1] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(
      await canvas.findByRole("button", { name: "Show the steps of Summarize a filing" }),
    );
    const failed = await waitFor(() => {
      const line = lineAt(canvasElement, `${BATCH}/*/step_2`);
      if (!line) throw new Error("the branch's steps are not drawn");
      return line;
    });
    expect(failed.dataset.state).toBe("failed");
    expect(failed.textContent).toContain("A pipe's output does not fit its concept");
    // Shown once: the batch's own line no longer carries it.
    const notes = lineAt(canvasElement, BATCH)?.querySelectorAll(
      ":scope > .mthds-simple-progress-notes .mthds-simple-progress-note--error",
    );
    expect(notes).toHaveLength(0);
  },
};

/**
 * A parallel of eight branches: its finished ones fold into one line, and the
 * branch being tried again says so.
 */
export const WideParallel: Story = {
  args: {
    snapshot: snapshotAt(VET_COMPANY_SNAPSHOTS, "14:00:05.000"),
    live: false,
    pipeRegistry: VET_COMPANY_REGISTRY,
    entryPipeRef: VET_ROOT,
  },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(lineAt(canvasElement, `${VET_ROOT}/step_2#finished`)?.textContent).toContain("4 done"),
    );
    expect(lineAt(canvasElement, `${VET_ROOT}/step_2`)?.textContent).toContain(
      "Trying again (attempt 2)",
    );
  },
};

/** Work nested deeper than the indentation cap: one line names what goes on beneath. */
export const DeepNesting: Story = {
  args: {
    snapshot: snapshotAt(VET_COMPANY_SNAPSHOTS, "14:00:45.000"),
    live: false,
    pipeRegistry: VET_COMPANY_REGISTRY,
    entryPipeRef: VET_ROOT,
  },
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(lineAt(canvasElement, `${VET_ROOT}/step_5/step_1/step_1#now`)?.textContent).toContain(
        "Now: Run the worst case",
      ),
    );
  },
};

/** The live region says what changed, in the headline's words, rather than every snapshot. */
export const Announcements: Story = {
  render: (args) => {
    const [frame, setFrame] = React.useState(0);
    const frames = [
      REVIEW_FILINGS_SNAPSHOTS[0],
      snapshotAt(REVIEW_FILINGS_SNAPSHOTS, "09:30:01.000"),
      snapshotAt(REVIEW_FILINGS_SNAPSHOTS, "09:30:08.000"),
    ];
    return (
      <div>
        <button type="button" onClick={() => setFrame((each) => Math.min(each + 1, 2))}>
          Next reading
        </button>
        <RunTimeline {...args} snapshot={frames[frame]} live={false} />
      </div>
    );
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const region = () =>
      canvasElement.querySelector('.mthds-simple-progress [aria-live="polite"]')?.textContent;
    expect(region()).toBe("");
    await userEvent.click(canvas.getByRole("button", { name: "Next reading" }));
    await waitFor(() => expect(region()).toBe("Now: Extract the filings from the document."));
    await userEvent.click(canvas.getByRole("button", { name: "Next reading" }));
    await waitFor(() =>
      expect(region()).toBe(
        "Done: Extract the filings from the document. Now: Decide how deep to check.",
      ),
    );
  },
};
