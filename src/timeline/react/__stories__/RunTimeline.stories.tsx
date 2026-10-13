import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import type { ProgressSnapshot } from "@timeline/progressSnapshot";
import { RunTimeline } from "../RunTimeline";
import { SnapshotReplay } from "./SnapshotReplay";
import {
  CANCELED_RUN_SNAPSHOT,
  REVIEW_FILINGS_SNAPSHOTS,
  WIDE_BATCH_SNAPSHOTS,
  WORKED_EXAMPLE_SNAPSHOT,
} from "./recordedRuns";

/**
 * The run timeline, drawn from the hosted progress contract's snapshot alone.
 *
 * `RecordedRun` replays the contract's worked example from its first event to
 * its end, one snapshot per change: rows appear as invocations start, bars grow
 * and settle, the condition's chosen branch and the parallel's branches appear
 * under it, the batch's items appear with their steps under them, item 2's
 * second step shows its work being tried again and keeps its attempts once it
 * recovers, and item 3 shows where the run is stuck until it advances again.
 */
const meta: Meta<typeof RunTimeline> = {
  title: "Timeline/RunTimeline",
  component: RunTimeline,
  decorators: [
    (Story) => (
      <div style={{ maxWidth: 1080, padding: 16, fontFamily: "sans-serif" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    theme: "dark",
  },
};

export default meta;
type Story = StoryObj<typeof RunTimeline>;

const ROOT = "filings.review_filings";
const BATCH = `${ROOT}/step_3`;

function rowAt(canvasElement: HTMLElement, path: string): HTMLElement | null {
  return canvasElement.querySelector<HTMLElement>(`li[data-path="${path}"]`);
}

function timelineOf(canvasElement: HTMLElement): HTMLElement {
  const timeline = canvasElement.querySelector<HTMLElement>("section.mthds-run-timeline");
  if (!timeline) throw new Error("no timeline drawn");
  return timeline;
}

/** The recorded run, replayed. Press Play, or step through it a snapshot at a time. */
export const RecordedRun: Story = {
  render: (args) => (
    <SnapshotReplay
      snapshots={REVIEW_FILINGS_SNAPSHOTS}
      autoplay
      initialSpeed={5}
      theme={args.theme}
    />
  ),
};

/**
 * The replay stepped through by hand, which is what its test does: each step
 * hands the timeline the next snapshot, and every row it already drew stays the
 * same element, in place.
 */
export const RecordedRunStepByStep: Story = {
  render: (args) => <SnapshotReplay snapshots={REVIEW_FILINGS_SNAPSHOTS} theme={args.theme} />,
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const next = canvas.getByRole("button", { name: "Next snapshot" });
    const stepUntil = async (done: () => boolean) => {
      for (let guard = 0; guard < REVIEW_FILINGS_SNAPSHOTS.length && !done(); guard += 1) {
        await userEvent.click(next);
      }
      expect(done()).toBe(true);
    };

    await expect(canvas.getByText("Waiting to start")).toBeInTheDocument();
    expect(rowAt(canvasElement, ROOT)).toBeNull();

    await stepUntil(() => rowAt(canvasElement, ROOT) !== null);
    const rootRow = rowAt(canvasElement, ROOT);
    expect(rootRow?.dataset.status).toBe("running");

    // The condition's chosen branch appears under it, carrying its outcome.
    await stepUntil(() => rowAt(canvasElement, `${ROOT}/step_2/outcome_detailed`) !== null);
    expect(rowAt(canvasElement, `${ROOT}/step_2/outcome_detailed`)?.textContent).toContain(
      "outcome detailed",
    );

    // The batch fans out: its items appear, then the steps under them.
    await stepUntil(() => rowAt(canvasElement, `${BATCH}/item_2/step_1`) !== null);
    expect(rowAt(canvasElement, BATCH)?.textContent).toContain("done");

    // Item 2's second step is retried, and shows its attempt.
    await stepUntil(
      () =>
        rowAt(canvasElement, `${BATCH}/item_2/step_2`)?.textContent?.includes("attempt 2") ?? false,
    );

    // ...and keeps its attempts once it has recovered.
    await stepUntil(
      () => rowAt(canvasElement, `${BATCH}/item_2/step_2`)?.dataset.status === "succeeded",
    );
    expect(rowAt(canvasElement, `${BATCH}/item_2/step_2`)?.textContent).toContain("2 attempts");

    await stepUntil(() => timelineOf(canvasElement).dataset.runStatus === "succeeded");
    await expect(canvas.getByText("Completed")).toBeInTheDocument();
    expect(rowAt(canvasElement, `${ROOT}/step_4`)?.dataset.status).toBe("succeeded");
    // The entry pipe's row was never redrawn: the same element from its first snapshot to its last.
    expect(rowAt(canvasElement, ROOT)).toBe(rootRow);
  },
};

/**
 * The snapshot the contract prints in its worked example, drawn as it is: the
 * batch at step 3 with one item done and two running, item 2's second step
 * being tried a second time, and item 3, where the run is stuck.
 */
export const WorkedExample: Story = {
  args: { snapshot: WORKED_EXAMPLE_SNAPSHOT, live: false },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText(WORKED_EXAMPLE_SNAPSHOT.summary)).toBeInTheDocument();
    expect(canvasElement.querySelectorAll("li.mthds-run-timeline-row")).toHaveLength(
      WORKED_EXAMPLE_SNAPSHOT.invocations.length,
    );
    expect(rowAt(canvasElement, BATCH)?.textContent).toContain("1 of 3 done · 2 running");
    expect(rowAt(canvasElement, `${BATCH}/item_2/step_2`)?.textContent).toContain("attempt 2");
    expect(rowAt(canvasElement, `${BATCH}/item_3`)?.textContent).toContain("stuck");
    expect(rowAt(canvasElement, `${BATCH}/item_3`)?.textContent).toContain("item 3 of 3");
    // The run status's degradation, in its own words.
    await expect(canvas.getByRole("status")).toHaveTextContent("failed 4 times in a row");
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

/**
 * A batch over twenty-four filings, replayed: it is wide, so it is one row
 * whose strip shows every item's state, and the item that fails stays in view.
 * The condition matched no key and took its default outcome.
 */
export const WideBatch: Story = {
  render: (args) => (
    <SnapshotReplay snapshots={WIDE_BATCH_SNAPSHOTS} autoplay initialSpeed={2} theme={args.theme} />
  ),
};

/**
 * The wide batch's run once it has failed. The batch starts collapsed, keeping
 * only its failed item in view; a click expands it into all its item rows.
 */
export const WideBatchCollapsed: Story = {
  args: { snapshot: WIDE_BATCH_SNAPSHOTS[WIDE_BATCH_SNAPSHOTS.length - 1] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const itemRows = () =>
      Array.from(canvasElement.querySelectorAll<HTMLElement>("li.mthds-run-timeline-row")).filter(
        (row) => /\/item_\d+$/.test(row.dataset.path ?? ""),
      );

    const toggle = canvas.getByRole("button", { name: /items of summarize_filing_batch/ });
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(itemRows().map((row) => row.dataset.path)).toEqual([`${BATCH}/item_9`]);
    expect(rowAt(canvasElement, BATCH)?.textContent).toContain("23 of 24 done · 1 failed");
    expect(rowAt(canvasElement, `${ROOT}/step_2/outcome_quick`)?.textContent).toContain(
      "default outcome",
    );

    await userEvent.click(toggle);
    await waitFor(() => expect(itemRows()).toHaveLength(24));
    expect(toggle).toHaveAttribute("aria-expanded", "true");

    await userEvent.click(toggle);
    await waitFor(() => expect(itemRows()).toHaveLength(1));
  },
};

/** A run canceled while its batch's items were running: their bars run open to the end. */
export const CanceledRun: Story = {
  args: { snapshot: CANCELED_RUN_SNAPSHOT },
};

/** A run accepted and not yet started. */
export const WaitingToStart: Story = {
  args: { snapshot: REVIEW_FILINGS_SNAPSHOTS[0] },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("Nothing has started yet.")).toBeInTheDocument();
    await expect(canvas.getByText("Waiting to start")).toBeInTheDocument();
  },
};

const RUNNING_EARLY = REVIEW_FILINGS_SNAPSHOTS[10];
const RUNNING_LATE = REVIEW_FILINGS_SNAPSHOTS[30];
const ENDED = REVIEW_FILINGS_SNAPSHOTS[REVIEW_FILINGS_SNAPSHOTS.length - 1];

interface FeedProps {
  deliveries: { label: string; snapshot: ProgressSnapshot }[];
}

/** Hands the timeline whichever snapshot a button names, as overlapping reads answering out of order would. */
function SnapshotFeed({ deliveries }: FeedProps) {
  const [snapshot, setSnapshot] = React.useState(deliveries[0].snapshot);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {deliveries.map((delivery) => (
          <button key={delivery.label} type="button" onClick={() => setSnapshot(delivery.snapshot)}>
            {delivery.label}
          </button>
        ))}
      </div>
      <RunTimeline snapshot={snapshot} live={false} theme="dark" />
    </div>
  );
}

/**
 * Reads that answer out of order: the timeline keeps the fresher snapshot by
 * the contract's rule, so a late answer with a lower version changes nothing,
 * and once the run has ended no snapshot of it still going replaces it.
 */
export const OutOfOrderReads: Story = {
  render: () => (
    <SnapshotFeed
      deliveries={[
        { label: "Read early", snapshot: RUNNING_EARLY },
        { label: "Read late", snapshot: RUNNING_LATE },
        { label: "Read the end", snapshot: ENDED },
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const version = () => Number(timelineOf(canvasElement).dataset.version);
    expect(version()).toBe(RUNNING_EARLY.version);

    await userEvent.click(canvas.getByRole("button", { name: "Read late" }));
    await waitFor(() => expect(version()).toBe(RUNNING_LATE.version));

    // An older read answering last changes nothing.
    await userEvent.click(canvas.getByRole("button", { name: "Read early" }));
    expect(version()).toBe(RUNNING_LATE.version);

    await userEvent.click(canvas.getByRole("button", { name: "Read the end" }));
    await waitFor(() => expect(timelineOf(canvasElement).dataset.runStatus).toBe("succeeded"));

    // A snapshot showing the run still going never replaces its end.
    await userEvent.click(canvas.getByRole("button", { name: "Read late" }));
    expect(timelineOf(canvasElement).dataset.runStatus).toBe("succeeded");
    expect(version()).toBe(ENDED.version);
  },
};
