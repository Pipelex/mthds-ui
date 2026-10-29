import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor, within } from "storybook/test";
import type { ProgressSnapshot, ProgressTimestamp } from "@timeline/progressSnapshot";
import { TIMELINE_STYLE_IDS } from "@timeline/styles/timelineStyles";
import { RunTimeline } from "../RunTimeline";
import { SnapshotReplay } from "./SnapshotReplay";
import { REVIEW_FILINGS_REGISTRY } from "./methodRegistries";
import {
  CANCELED_RUN_SNAPSHOT,
  HUNDREDS_OF_ITEMS_FAILED,
  HUNDREDS_OF_ITEMS_MID_RUN_SNAPSHOT,
  OUTAGE_END_SNAPSHOT,
  OUTAGE_FIRST_FAILED_ITEM,
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
 *
 * The `timelineStyle` control redraws a story in another style; the simple
 * style's own stories are under `Timeline/RunTimeline/Simple`.
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
  argTypes: {
    timelineStyle: { control: "inline-radio", options: TIMELINE_STYLE_IDS },
  },
  args: {
    theme: "dark",
    // The method the recorded runs ran, for the simple style; the detailed style reads neither.
    pipeRegistry: REVIEW_FILINGS_REGISTRY,
    entryPipeRef: "filings.review_filings",
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

/** The paths of the batch's item rows drawn, in drawing order. */
function itemPaths(canvasElement: HTMLElement, batch = BATCH): string[] {
  const prefix = `${batch}/item_`;
  return Array.from(canvasElement.querySelectorAll<HTMLElement>("li.mthds-run-timeline-row"))
    .map((row) => row.dataset.path ?? "")
    .filter((path) => path.startsWith(prefix) && /^\d+$/.test(path.slice(prefix.length)));
}

/** The paths of the items numbered `from` to `to`, as `itemPaths` gives them. */
function itemRange(from: number, to: number): string[] {
  return Array.from({ length: to - from + 1 }, (_, index) => `${BATCH}/item_${from + index}`);
}

function pagerAt(canvasElement: HTMLElement, batch = BATCH): HTMLElement | null {
  return canvasElement.querySelector<HTMLElement>(`li[data-pager-for="${batch}"]`);
}

function batchToggle(canvasElement: HTMLElement): HTMLElement {
  return within(canvasElement).getByRole("button", { name: /items of summarize_filing_batch/ });
}

/** The class the timeline carries while its own clock ticks. */
const SELF_CLOCKED_CLASS = "mthds-run-timeline--self-clocked";

/** The recorded run, replayed. Press Play, or step through it a snapshot at a time. */
export const RecordedRun: Story = {
  render: (args) => (
    <SnapshotReplay
      snapshots={REVIEW_FILINGS_SNAPSHOTS}
      autoplay
      initialSpeed={5}
      theme={args.theme}
      timelineStyle={args.timelineStyle}
      pipeRegistry={args.pipeRegistry}
      entryPipeRef={args.entryPipeRef}
    />
  ),
};

/**
 * The replay stepped through by hand, which is what its test does: each step
 * hands the timeline the next snapshot, and every row it already drew stays the
 * same element, in place.
 */
export const RecordedRunStepByStep: Story = {
  render: (args) => (
    <SnapshotReplay
      snapshots={REVIEW_FILINGS_SNAPSHOTS}
      theme={args.theme}
      timelineStyle={args.timelineStyle}
      pipeRegistry={args.pipeRegistry}
      entryPipeRef={args.entryPipeRef}
    />
  ),
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
    // The condition resolved to `detailed`, so its branch's tooltip says it took that outcome.
    expect(rowAt(canvasElement, `${ROOT}/step_2/outcome_detailed`)?.title).toContain(
      "Took the outcome detailed",
    );
    // The run status's degradation, in its own words.
    await expect(canvas.getByRole("status")).toHaveTextContent("failed 4 times in a row");
  },
};

/**
 * A dry run's condition, which resolves nothing and runs every outcome group:
 * each branch is named by its path, and its tooltip never says the condition
 * took that outcome, only that it is the branch for it.
 */
export const DryRunCondition: Story = {
  args: {
    live: false,
    snapshot: {
      pipeline_run_id: "run_dry_condition",
      mode: "dry",
      status: "succeeded",
      version: 3,
      assembled_at: "2026-10-12T09:30:01.000Z",
      summary: "Completed",
      invocations: [
        {
          path: ROOT,
          pipe_code: "choose_depth",
          pipe_ref: "filings.choose_depth",
          pipe_type: "PipeCondition",
          status: "succeeded",
          started_at: "2026-10-12T09:30:00.000Z",
          ended_at: "2026-10-12T09:30:00.900Z",
        },
        {
          path: `${ROOT}/outcome_high%20risk`,
          pipe_code: "deep_checks",
          pipe_ref: "filings.deep_checks",
          pipe_type: "PipeLLM",
          status: "succeeded",
          started_at: "2026-10-12T09:30:00.100Z",
          ended_at: "2026-10-12T09:30:00.500Z",
        },
        {
          path: `${ROOT}/default`,
          pipe_code: "quick_check",
          pipe_ref: "filings.quick_check",
          pipe_type: "PipeLLM",
          status: "succeeded",
          started_at: "2026-10-12T09:30:00.100Z",
          ended_at: "2026-10-12T09:30:00.400Z",
        },
      ],
    },
  },
  play: async ({ canvasElement }) => {
    const keyed = rowAt(canvasElement, `${ROOT}/outcome_high%20risk`);
    const fallback = rowAt(canvasElement, `${ROOT}/default`);
    await expect(keyed).toBeInTheDocument();
    expect(keyed?.textContent).toContain("outcome high risk");
    expect(keyed?.title).toContain("The branch for the outcome high risk");
    expect(fallback?.title).toContain("The branch for the default outcome");
    for (const row of [keyed, fallback]) expect(row?.title).not.toMatch(/Took/);
  },
};

/** The success colour, set by a host through `paletteColors`. */
const HOST_SUCCESS_COLOR = "rgb(1, 2, 3)";

/**
 * A host's palette override: `paletteColors` is merged per key over the
 * theme's palette, so the succeeded bars take the host's colour and every other
 * token keeps the theme's.
 */
export const PaletteOverride: Story = {
  args: {
    snapshot: WORKED_EXAMPLE_SNAPSHOT,
    live: false,
    paletteColors: { "--color-success": HOST_SUCCESS_COLOR },
  },
  play: async ({ canvasElement }) => {
    const bar = rowAt(canvasElement, `${ROOT}/step_1`)?.querySelector(".mthds-run-timeline-bar");
    if (!bar) throw new Error("no bar drawn for step 1");
    await waitFor(() => expect(getComputedStyle(bar).backgroundColor).toBe(HOST_SUCCESS_COLOR));
    // Every token the host did not name keeps the dark theme's value.
    expect(getComputedStyle(timelineOf(canvasElement)).getPropertyValue("--color-error")).toBe(
      "#FF5555",
    );
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
    <SnapshotReplay
      snapshots={WIDE_BATCH_SNAPSHOTS}
      autoplay
      initialSpeed={2}
      theme={args.theme}
      timelineStyle={args.timelineStyle}
      pipeRegistry={args.pipeRegistry}
      entryPipeRef={args.entryPipeRef}
    />
  ),
};

/**
 * The wide batch's run once it has failed. The batch starts collapsed, keeping
 * only its failed item in view; a click expands it onto the first of its pages
 * of ten items, with a pager beneath them.
 */
export const WideBatchCollapsed: Story = {
  args: { snapshot: WIDE_BATCH_SNAPSHOTS[WIDE_BATCH_SNAPSHOTS.length - 1] },
  play: async ({ canvasElement }) => {
    const toggle = batchToggle(canvasElement);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(itemPaths(canvasElement)).toEqual([`${BATCH}/item_9`]);
    expect(pagerAt(canvasElement)).toBeNull();
    expect(rowAt(canvasElement, BATCH)?.textContent).toContain("23 of 24 done · 1 failed");
    expect(rowAt(canvasElement, `${ROOT}/step_2/outcome_quick`)?.textContent).toContain(
      "default outcome",
    );

    await userEvent.click(toggle);
    await waitFor(() => expect(itemPaths(canvasElement)).toEqual(itemRange(1, 10)));
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    const pagerElement = pagerAt(canvasElement);
    if (!pagerElement) throw new Error("no pager drawn");
    const pager = within(pagerElement);
    expect(pager.getByRole("navigation", { name: "Items of summarize_filing_batch" })).toBeTruthy();
    expect(pager.getByText("Items 1–10 of 24")).toBeInTheDocument();
    expect(rowAt(canvasElement, BATCH)?.textContent).toContain("14 items hidden");
    // The failed item is on this page, so the pager offers no jump.
    expect(pager.queryByRole("button", { name: /Next failed/ })).toBeNull();
    const previous = pager.getByRole("button", { name: "Previous" });
    const next = pager.getByRole("button", { name: "Next" });
    expect(previous).toHaveAttribute("aria-disabled", "true");

    await userEvent.click(next);
    await waitFor(() => expect(itemPaths(canvasElement)).toEqual(itemRange(11, 20)));
    // The page turn keeps the pager, and focus on the button pressed.
    expect(pagerAt(canvasElement)).toBe(pagerElement);
    expect(next).toHaveFocus();
    expect(pager.getByText("Items 11–20 of 24")).toBeInTheDocument();
    expect(pager.getByRole("button", { name: "Next failed · item 9" })).toBeInTheDocument();

    await userEvent.click(next);
    await waitFor(() => expect(itemPaths(canvasElement)).toEqual(itemRange(21, 24)));
    expect(next).toHaveAttribute("aria-disabled", "true");
    expect(next).toHaveFocus();
    expect(rowAt(canvasElement, BATCH)?.textContent).toContain("20 items hidden");
    await userEvent.click(next);
    expect(itemPaths(canvasElement)).toEqual(itemRange(21, 24));

    // The jump turns back to the page holding the failed item; with no item in
    // trouble left off the page, the jump goes, and focus moves to Previous.
    await userEvent.click(pager.getByRole("button", { name: "Next failed · item 9" }));
    await waitFor(() => expect(itemPaths(canvasElement)).toEqual(itemRange(1, 10)));
    expect(rowAt(canvasElement, `${BATCH}/item_9`)?.dataset.status).toBe("failed");
    expect(previous).toHaveFocus();

    // The page is remembered across collapsing and expanding again.
    await userEvent.click(next);
    await waitFor(() => expect(itemPaths(canvasElement)).toEqual(itemRange(11, 20)));
    await userEvent.click(toggle);
    await waitFor(() => expect(itemPaths(canvasElement)).toEqual([`${BATCH}/item_9`]));
    expect(pagerAt(canvasElement)).toBeNull();
    await userEvent.click(toggle);
    await waitFor(() => expect(itemPaths(canvasElement)).toEqual(itemRange(11, 20)));
  },
};

/**
 * A batch over four hundred filings, part-way through: two of its items have
 * failed, one on its first page and one in the middle. Expanded, it draws ten
 * items at a time; the pager turns its pages and jumps to the next failed item.
 */
export const HundredsOfItems: Story = {
  args: { snapshot: HUNDREDS_OF_ITEMS_MID_RUN_SNAPSHOT, live: false },
  play: async ({ canvasElement }) => {
    const [early, middle] = HUNDREDS_OF_ITEMS_FAILED;
    const toggle = batchToggle(canvasElement);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(itemPaths(canvasElement)).toEqual([`${BATCH}/item_${early}`, `${BATCH}/item_${middle}`]);

    await userEvent.click(toggle);
    await waitFor(() => expect(itemPaths(canvasElement)).toEqual(itemRange(1, 10)));
    const pagerElement = pagerAt(canvasElement);
    if (!pagerElement) throw new Error("no pager drawn");
    const pager = within(pagerElement);
    expect(pager.getByText("Items 1–10 of 400")).toBeInTheDocument();
    // The pager follows the last row of the page's last item, the rows before
    // the batch stay drawn, and nothing of the batch lies past the pager.
    expect(rowAt(canvasElement, `${BATCH}/item_10/step_2`)?.nextElementSibling).toBe(pagerElement);
    expect(rowAt(canvasElement, `${ROOT}/step_2/outcome_quick`)).not.toBeNull();
    const after = pagerElement.nextElementSibling as HTMLElement | null;
    expect(after?.dataset.path?.startsWith(`${BATCH}/`) ?? false).toBe(false);

    await userEvent.click(pager.getByRole("button", { name: "Next" }));
    await waitFor(() => expect(itemPaths(canvasElement)).toEqual(itemRange(11, 20)));
    expect(pager.getByText("Items 11–20 of 400")).toBeInTheDocument();

    const jump = pager.getByRole("button", { name: `Next failed · item ${middle}` });
    await userEvent.click(jump);
    const pageStart = Math.floor((middle - 1) / 10) * 10 + 1;
    await waitFor(() =>
      expect(itemPaths(canvasElement)).toEqual(itemRange(pageStart, pageStart + 9)),
    );
    expect(rowAt(canvasElement, `${BATCH}/item_${middle}`)?.dataset.status).toBe("failed");
    // Past the middle failure, the next one is the early item, from the start.
    expect(jump).toHaveAccessibleName(`Next failed · item ${early}`);
    expect(jump).toHaveFocus();
  },
};

/**
 * The same batch during an outage: past its first thirty items, every item
 * failed. Collapsed, it keeps only its first ten failed items in view, and a
 * row beneath them says how many more failed, with a button that opens the
 * batch on the page of the first one not shown.
 */
export const HundredsOfItemsFailing: Story = {
  args: { snapshot: OUTAGE_END_SNAPSHOT },
  play: async ({ canvasElement }) => {
    const first = OUTAGE_FIRST_FAILED_ITEM;
    const toggle = batchToggle(canvasElement);
    expect(toggle).toHaveAttribute("aria-expanded", "false");
    expect(itemPaths(canvasElement)).toEqual(itemRange(first, first + 9));
    const pagerElement = pagerAt(canvasElement);
    if (!pagerElement) throw new Error("no overflow row drawn");
    const pager = within(pagerElement);
    expect(pager.getByText(`${400 - first + 1 - 10} more failed`)).toBeInTheDocument();
    expect(rowAt(canvasElement, `${BATCH}/item_${first + 9}/step_1`)?.nextElementSibling).toBe(
      pagerElement,
    );

    await userEvent.click(pager.getByRole("button", { name: `Expand at item ${first + 10}` }));
    const pageStart = Math.floor((first + 10 - 1) / 10) * 10 + 1;
    await waitFor(() =>
      expect(itemPaths(canvasElement)).toEqual(itemRange(pageStart, pageStart + 9)),
    );
    expect(toggle).toHaveAttribute("aria-expanded", "true");
    expect(pagerAt(canvasElement)).toBe(pagerElement);
    expect(pager.getByText(`Items ${pageStart}–${pageStart + 9} of 400`)).toBeInTheDocument();
    expect(rowAt(canvasElement, `${BATCH}/item_${first + 10}`)?.dataset.status).toBe("failed");
    // The button pressed went with the collapsed row, so focus moved to the pager's first.
    expect(pager.getByRole("button", { name: "Previous" })).toHaveFocus();
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
    // Nothing follows the clock, so the timeline keeps no clock ticking for nothing.
    expect(timelineOf(canvasElement).classList.contains(SELF_CLOCKED_CLASS)).toBe(false);
  },
};

/**
 * A run that failed before its first invocation started: there is nothing to
 * draw, and nothing to wait for either, so the timeline does not say there is.
 */
export const FailedBeforeStarting: Story = {
  args: {
    snapshot: { ...REVIEW_FILINGS_SNAPSHOTS[0], status: "failed", summary: "Failed" },
  },
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await expect(canvas.getByText("No progress was recorded.")).toBeInTheDocument();
    expect(canvas.queryByText("Nothing has started yet.")).toBeNull();
  },
};

/**
 * The timeline as a flex item beside a sidebar, in a row 900 pixels wide: it
 * takes the room its container gives it, whatever it holds.
 */
export const InARowFlexContainer: Story = {
  args: { snapshot: WORKED_EXAMPLE_SNAPSHOT, live: false },
  decorators: [
    (Story) => (
      <div style={{ display: "flex", gap: 16, width: 900 }}>
        <aside style={{ flex: "0 0 160px", color: "#64748b" }}>A host's sidebar</aside>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    // Beside a 160-pixel sidebar and a 16-pixel gap.
    const width = () => timelineOf(canvasElement).getBoundingClientRect().width;
    await waitFor(() => expect(Math.abs(width() - (900 - 160 - 16))).toBeLessThan(1));
  },
};

const RUNNING_EARLY = REVIEW_FILINGS_SNAPSHOTS[10];
const RUNNING_LATE = REVIEW_FILINGS_SNAPSHOTS[30];
const ENDED = REVIEW_FILINGS_SNAPSHOTS[REVIEW_FILINGS_SNAPSHOTS.length - 1];

interface FeedProps {
  deliveries: { label: string; snapshot: ProgressSnapshot }[];
  /** Whether the timeline keeps its own clock. Off by default, so each snapshot is drawn as of its `assembled_at`. */
  live?: boolean;
}

/** Hands the timeline whichever snapshot a button names, as overlapping reads answering out of order would. */
function SnapshotFeed({ deliveries, live = false }: FeedProps) {
  const [snapshot, setSnapshot] = React.useState(deliveries[0].snapshot);
  // When the feed mounted, on the page's clock, so a test can bound how far a
  // self-ticking clock can have moved since: no further than the page's clock.
  const [mountedAt] = React.useState(() => performance.now());
  return (
    <div data-mounted-at={mountedAt} style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        {deliveries.map((delivery) => (
          <button key={delivery.label} type="button" onClick={() => setSnapshot(delivery.snapshot)}>
            {delivery.label}
          </button>
        ))}
      </div>
      <RunTimeline snapshot={snapshot} live={live} theme="dark" />
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

const SLOW_POLL_ROOT = "filings.condense_filing";

/** A row's duration, in seconds, as its detail column reads it (`3.2s`). */
function elapsedSeconds(canvasElement: HTMLElement, path: string): number {
  return Number.parseFloat(
    rowAt(canvasElement, path)?.querySelector(".mthds-run-timeline-detail")?.textContent ?? "",
  );
}

/** How long an element's transition of one property lasts, as computed (`0.25s`), or `null` when it has none. */
function transitionOf(element: Element, property: string): string | null {
  const style = getComputedStyle(element);
  const properties = style.transitionProperty.split(",").map((each) => each.trim());
  const durations = style.transitionDuration.split(",").map((each) => each.trim());
  const index = properties.indexOf(property);
  return index === -1 ? null : (durations[index % durations.length] ?? null);
}

/** One running invocation, started two seconds before the first read was projected. */
function slowPollSnapshot(overrides: Partial<ProgressSnapshot>): ProgressSnapshot {
  return {
    pipeline_run_id: "run_slow_poll",
    mode: "live",
    status: "running",
    version: 1,
    assembled_at: "2026-10-12T09:30:02.000Z",
    summary: "Running condense_filing",
    invocations: [
      {
        path: SLOW_POLL_ROOT,
        pipe_code: "condense_filing",
        pipe_ref: SLOW_POLL_ROOT,
        pipe_type: "PipeLLM",
        status: "running",
        started_at: "2026-10-12T09:30:00.000Z",
        ended_at: null,
      },
    ],
    ...overrides,
  };
}

/**
 * The self-ticking clock across a slow read. The second read is newer, but it
 * was projected 300 ms after the first and arrives seconds later, by when the
 * clock already shows more: the clock carries on from what it showed rather
 * than jumping back, so the running bar never shrinks. A read of another run
 * starts the clock afresh from its own `assembled_at`.
 */
export const SlowRead: Story = {
  render: () => (
    <SnapshotFeed
      live
      deliveries={[
        { label: "First read", snapshot: slowPollSnapshot({}) },
        {
          label: "Read slowly",
          snapshot: slowPollSnapshot({ version: 2, assembled_at: "2026-10-12T09:30:02.300Z" }),
        },
        {
          label: "Read another run",
          snapshot: slowPollSnapshot({
            pipeline_run_id: "run_other",
            assembled_at: "2026-10-12T09:30:02.300Z",
          }),
        },
      ]}
    />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const timeline = timelineOf(canvasElement);
    const mountedAt = Number(
      canvasElement.querySelector<HTMLElement>("[data-mounted-at]")?.dataset.mountedAt,
    );
    // The clock starts at the first read's `assembled_at`, two seconds after the
    // invocation started, and has since moved on by no more than the page's own
    // clock, read after it. The label rounds to a tenth of a second.
    const first = elapsedSeconds(canvasElement, SLOW_POLL_ROOT);
    const sincePageMount = (performance.now() - mountedAt) / 1_000;
    expect(first).toBeGreaterThanOrEqual(2);
    expect(first).toBeLessThan(2 + sincePageMount + 0.1);
    expect(timeline.classList.contains(SELF_CLOCKED_CLASS)).toBe(true);

    // The axis's ticks glide with the bars, so their labels never disagree with the bars' ends.
    const tick = timeline.querySelector(".mthds-run-timeline-tick");
    const bar = timeline.querySelector(".mthds-run-timeline-bar");
    if (!tick || !bar) throw new Error("no tick or no bar drawn");
    expect(transitionOf(bar, "left")).toBe("0.25s");
    expect(transitionOf(tick, "left")).toBe(transitionOf(bar, "left"));

    const elapsed = () => elapsedSeconds(canvasElement, SLOW_POLL_ROOT);
    await waitFor(() => expect(elapsed()).toBeGreaterThanOrEqual(3), { timeout: 5_000 });
    const shown = elapsed();

    await userEvent.click(canvas.getByRole("button", { name: "Read slowly" }));
    await waitFor(() => expect(timelineOf(canvasElement).dataset.version).toBe("2"));
    expect(elapsed()).toBeGreaterThanOrEqual(shown);

    await userEvent.click(canvas.getByRole("button", { name: "Read another run" }));
    await waitFor(() => expect(timelineOf(canvasElement).dataset.version).toBe("1"));
    expect(elapsed()).toBeLessThan(shown);
  },
};

interface PinnableClockProps {
  snapshot: ProgressSnapshot;
  /** The moment the host pins the clock to. */
  pinnedNow: ProgressTimestamp;
}

/** Pins the timeline's clock and releases it, as a host keeping its own clock for a while would. */
function PinnableClock({ snapshot, pinnedNow }: PinnableClockProps) {
  const [now, setNow] = React.useState<ProgressTimestamp | undefined>(undefined);
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={() => setNow(pinnedNow)}>
          Pin the clock
        </button>
        <button type="button" onClick={() => setNow(undefined)}>
          Release the clock
        </button>
      </div>
      <RunTimeline snapshot={snapshot} now={now} theme="dark" />
    </div>
  );
}

/**
 * A host pins the clock half a minute past the snapshot, then releases it. The
 * pinned moment was the host's, not one the timeline's own clock showed, so the
 * released clock starts again from the snapshot's `assembled_at` rather than
 * carrying on from the pinned moment.
 */
export const PinnedClockReleased: Story = {
  render: () => (
    <PinnableClock snapshot={slowPollSnapshot({})} pinnedNow="2026-10-12T09:30:30.000Z" />
  ),
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    const timeline = timelineOf(canvasElement);
    const elapsed = () => elapsedSeconds(canvasElement, SLOW_POLL_ROOT);
    expect(timeline.classList.contains(SELF_CLOCKED_CLASS)).toBe(true);

    await userEvent.click(canvas.getByRole("button", { name: "Pin the clock" }));
    await waitFor(() => expect(elapsed()).toBe(30));
    expect(timeline.classList.contains(SELF_CLOCKED_CLASS)).toBe(false);

    await userEvent.click(canvas.getByRole("button", { name: "Release the clock" }));
    await waitFor(() => expect(timeline.classList.contains(SELF_CLOCKED_CLASS)).toBe(true));
    // Two seconds after the start, plus what the page's clock has measured since: far from thirty.
    expect(elapsed()).toBeLessThan(10);
  },
};
