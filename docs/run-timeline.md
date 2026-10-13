# The run timeline

`RunTimeline` draws a running run's progress the way a workflow engine's event timeline does: one row per invocation of a pipe, nested under the controller that ran it, and a bar on a shared time axis from the invocation's start to its end, which grows while the invocation runs. It draws from the **progress snapshot** of the hosted progress contract and from nothing else: no method graph is drawn beforehand, a row appears only when the run reaches its invocation, and no batch width is ever guessed.

```tsx
import { RunTimeline } from "@pipelex/mthds-ui/timeline/react";
import type { ProgressSnapshot } from "@pipelex/mthds-ui/timeline";

<RunTimeline snapshot={snapshot} theme="dark" />;
```

The component and its stylesheet live behind `./timeline/react`, whose entry imports the stylesheet itself, so a host's bundler picks it up with the component. The snapshot's types, the invocation path grammar and the pure projection the component draws live behind `./timeline`, which needs neither React nor anything else installed, so a server or a worker can read a snapshot with the same code the timeline uses.

## The snapshot, and where it comes from

The snapshot is data, defined apart from the carriers that deliver it: a progress route a client polls, a frame over a WebSocket that tells a browser the snapshot has a newer version, or the state another workflow platform publishes for a task. The timeline reads the snapshot alone, so it draws a run from any carrier and any engine that publishes it. `ProgressSnapshot` and `ProgressInvocation` model it field for field: `pipe_type` and `degradation.reason` are open strings, an optional field is absent rather than `null`, and a member the types do not know is ignored rather than rejected.

**Hand the timeline every snapshot you read.** Reads that overlap can answer out of order, so the timeline keeps, of the snapshot it holds and the one it is handed, the fresher by the contract's rule (`fresherSnapshot`):

- never a snapshot showing the run pending or running over one showing it ended, whatever their versions;
- otherwise the higher `version`;
- at the same version, the later `assembled_at`.

A late answer with a lower version therefore changes nothing, and once the run has ended no snapshot of it still going replaces it. A snapshot of another run, another mode or another part of a run replaces the held one outright. A host that wants to rewind, as the stories' replay does, mounts a fresh timeline with a new `key`.

## Props

| Prop | Default | What it does |
| --- | --- | --- |
| `snapshot` | required | The progress snapshot to draw, or a newer one to consider. |
| `theme` | `"system"` | `dark`, `light`, or `system` to follow the environment, as `GraphViewer`'s theme mode. |
| `systemTheme` | — | The environment's theme when the host detects it itself, as on `GraphViewer`. |
| `live` | `true` | While the run goes on, keep running bars growing between snapshots. |
| `now` | — | Pins the reading clock, as a timestamp or epoch milliseconds; the timeline then never ticks on its own. |
| `wideBatchThreshold` | `10` (`DEFAULT_WIDE_BATCH_THRESHOLD`) | A batch holding more items than this starts collapsed. |
| `className` | — | Appended to the container's class list. |

**The reading clock.** A running invocation's bar grows to "now", and the timeline does not trust the page's clock to agree with the server's. It starts from the snapshot's `assembled_at`, the moment the snapshot was projected, and, while `live` is on and the run goes on, advances it by the time the page has measured since that snapshot arrived, four times a second, the bars gliding between repaints. A newer snapshot resets it. With `live={false}` each snapshot is drawn as of its `assembled_at`. A host that keeps a trusted clock of its own, or a replay, passes it as `now`.

## What it draws

**The header** shows the run's status and the snapshot's `summary`, the one line the contract words for every reader, shown as it is and never parsed. When the run reads degraded, the run status's `degradation.message` shows beneath it, in its own words.

**One row per invocation**, labelled with its `pipe_code` and its place under its parent, worded as the summary words it: `step 2 of 4`, `branch 1 of 2`, `item 3 of 40`, each without its ` of …` when the parent carries no count. Rows nest by invocation path, children ordered by the number in their segment, and an invocation whose parent is missing from the snapshot nests under its nearest ancestor that is there, so a snapshot of part of a run, which starts at its `root_path`, draws the same way. A segment the grammar does not define is shown as written.

**The bar** runs from the start of the invocation's latest attempt to its end. Its colour gives the status: running, succeeded, failed, and the dimmed scheduled, skipped and canceled. A running bar is striped and grows to the reading clock; a skipped one is a dashed outline, since it ended with no output of its own; a canceled one recorded no end, so its dashed outline runs to the end of the axis. A scheduled item has no bar. The axis spans the earliest start to the reading clock while the run goes on, and to the latest time the snapshot recorded once it has ended, since an ended run's `assembled_at` is only when it was read. The detail column on the right gives each row's duration, or its state when it has none.

**A batch is one collapsible row**, whatever its width. Its bar is a frame spanning the batch, with a thin strip of its items' states inside it, one cell per run of consecutive items sharing a state, and a failed item's cell never narrower than two pixels however many items share the bar. Its detail column reads the snapshot's counts, `12 of 40 done · 6 running · 1 failed`, the failed count shown when it is not zero. A batch holding more items than `wideBatchThreshold` starts collapsed and one that holds fewer starts expanded; the toggle beside its name switches it, and the timeline remembers the choice per batch for as long as it draws the same run. Collapsed, it still draws every item that failed, and every item where the run is stuck (an item carrying `degradation`), with everything under it, so the trouble can always be pointed at. The counts are always the snapshot's own and never recounted from the rows: an item scheduled or canceled is counted in none of them. Bounding the rows of an expanded batch of several hundred items, by pages or by scrolling, is not done yet.

**A condition's branch carries the outcome it took.** Its row reads `outcome detailed`, or `default outcome`. When the condition has resolved, the name is its `selected_outcome`, the key it matched, which can differ from the key in the path: a path names an outcome group by the first key, in the order the outcome map declares them, that runs the group's pipe, so a condition that matched `medium` in a group whose first key is `low` has its branch at `outcome_low` while its row reads `outcome medium`, and a condition that took its default outcome reads `default outcome` even when its branch's path is a key's. A dry run's condition resolves nothing and runs every group, so each of its branches is named by its path.

**Health annotations ride on their row**, the way a workflow engine's timeline marks a retried activity. An invocation whose work was tried more than once shows a `↻` badge: `attempt 2` in the warning colour while it is being tried again, its bar turned to the warning colour with it; `2 attempts` in a quiet tone once it has succeeded, the mark of a recovered invocation; and in the failure colour when it failed after them. Where its `last_failure` carries a time inside its bar, a tick marks that moment on the bar. The invocation where the run is stuck carries a `stuck` badge and a dashed outline around its bar. An annotation's text, the failure's message and the degradation's, is in the row's tooltip with everything else the snapshot says of the invocation. An absent annotation means that nothing was observed, never that all is well.

## The pure surface

Everything the component decides is a pure function of the snapshot, exported from `./timeline` and unit-tested in `src/timeline/__tests__/`:

| Export | What it is |
| --- | --- |
| `ProgressSnapshot`, `ProgressInvocation`, `BatchProgress`, `ConditionProgress`, `InvocationFailure`, `ProgressDegradation`, `ExecutionAttempt` | The snapshot's types, named field for field after the contract. |
| `RUN_PROGRESS_STATUS`, `INVOCATION_STATUS`, `PROGRESS_MODE`, `DEGRADATION_REASON` | Its closed vocabularies as typed constants (the reasons are the ones emitted today, `reason` stays open). |
| `isRunEnded`, `timestampMs` | Whether a run has ended; a timestamp in epoch milliseconds, keeping digits past the millisecond. |
| `parsePathSegment`, `splitInvocationPath`, `parentInvocationPath`, `lastPathSegment`, `decodeOutcomeKey`, `invocationPathDepth` | The invocation path grammar. |
| `fresherSnapshot`, `isSameProgressStream` | The rule a reader keeps the fresher of two snapshots by. |
| `buildTimelineRows` | The rows a timeline draws, in drawing order, with their depth, place, outcome, batch strip and collapse state. |
| `timelineWindow`, `invocationBar`, `readingClockMs`, `timelineTicks`, `axisPercent`, `formatDuration`, `formatClockTime` | The shared axis, each bar on it, and the labels. |

`buildTimelineRows` returns the same rows for the same snapshot and options, and keys nothing on time, which is what lets the component repaint on every snapshot while keeping each row it already drew in place: React keys each row by its path.

## Styling

The timeline uses the same semantic tokens as the graph viewer (`docs/theming.md`), applying the palette of its resolved theme inline on its own container, so it themes correctly with no viewer in the tree, and a host's `--color-*` or `--surface-*` overrides on the container restyle it. Three variables on `.mthds-run-timeline` set its layout: `--mthds-run-timeline-name-width` (the name column), `--mthds-run-timeline-meta-width` (the detail column) and `--mthds-run-timeline-indent` (each nesting level's indent). Below 560 pixels of width each row moves to two lines, its name and detail above and its bar across the whole width below. Rows fade in as they appear and running bars' stripes move, both stilled under `prefers-reduced-motion`.

## The stories

`make storybook` and open **Timeline / RunTimeline**. `RecordedRun` replays the contract's worked example from its first event to its end, one snapshot per change, with play, step and speed controls: rows appear as invocations start, bars grow and settle, the condition's chosen branch and the parallel's branches appear under it, the batch's items appear with their steps, item 2's second step is tried again and keeps its attempts once it recovers, and item 3 shows where the run is stuck until it advances. `WideBatch` replays a batch over twenty-four filings, collapsed into one row whose failed item stays in view. `WorkedExample` draws the contract's mid-run snapshot exactly as the contract prints it, and the other stories cover the light theme, a canceled run, a run not yet started and reads answering out of order. Their play functions are the component's browser tests.

The recorded runs are written by hand in `src/timeline/react/__stories__/recordedRuns.ts`: each invocation with its start and end, each fan-out and resolution, and what the engine reported of the run's health over time. `runRecorder.ts` stands in for a carrier, projecting a recording at any moment into a contract-shaped snapshot, its `summary` worded by the contract's rule, and `src/timeline/__tests__/recordedRuns.test.ts` holds it to the contract: the recording of the worked example's run, taken at the example's moment, equals the snapshot the contract prints, version and summary included.
