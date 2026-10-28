# Timeline styles

A **timeline style** is how `RunTimeline` draws a progress snapshot. The styles are a closed, typed registry, as the graph viewer's are ([graph-styles.md](graph-styles.md)): `TIMELINE_STYLES` in `./timeline` holds each style's name and the one line a menu shows under it, and the React layer holds the view that draws it.

| Style                   | What it draws                                                                                                               | Who it is for                                                                                             |
| ----------------------- | --------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `detailed`, the default | Every invocation as a row labelled by its pipe code, with a bar on a shared time axis ([run-timeline.md](run-timeline.md)). | Someone who wrote the method, or who debugs a run.                                                        |
| `simple`                | The run as a checklist of its steps in the method's own words, a batch as one line with its counts, and no time axis.       | Someone who runs a method they did not write and wants to know whether it is going well and what is left. |

Both styles read the same snapshot, keep it by the same freshness rule and run the same reading clock, held by `RunTimeline` above the switch between them, so switching style never loses a read or moves the clock back. What the reader opened in each style is held there too, so switching away and back finds it still open.

## Choosing a style

```tsx
<RunTimeline
  snapshot={snapshot}
  timelineStyle="simple"
  pipeRegistry={graphSpec.pipe_registry}
  entryPipeRef="filings.review_filings"
  styleMenu
  onTimelineStyleChange={saveTheReadersChoice}
/>
```

- **`timelineStyle`** names the style. It is reactive, like `theme`: passing it drives the active style, and clearing it back to `undefined` hands control to the default, `detailed`. A value naming no registered style is treated as unset rather than thrown on (`resolveTimelineStyle`), so a host relaying a setting written for a newer version of this package still gets a timeline.
- **`styleMenu`** shows a style menu at the end of the header. It is opt-in, for a host that fixes the style for its audience: `true` offers every registered style in registry order, a list such as `["simple", "detailed"]` offers those in that order, and anything that leaves fewer than two styles to choose between offers no menu (`resolveTimelineStyleMenu`). The menu is the graph viewer's own, made generic over its options: the same list of radio items with each style's icon, name and description, the same keyboard (arrows, Home and End move, Enter or Space choose, Escape closes and returns to the button), and the same stylesheet, `StyleMenu.css`, which the `./timeline/react` entry imports from the graph entry's copy.
- **`onTimelineStyleChange`** is called whenever the style changes, from the menu or from a change of `timelineStyle`, and never on mount. This library persists nothing: the host keeps the reader's choice.

## The simple style

**Its words come from the method.** The simple style titles each line from its pipe's `description` in the registry of the method's pipes the host passes as `pipeRegistry`, keyed by `pipe_ref`, the same map a `GraphSpec` carries as `pipe_registry`. A description is shown as its author wrote it, whitespace collapsed and one closing period dropped, as the simple graph style shows a step's. Without a registry, or for a pipe the registry lacks, a line is titled by its humanized pipe code (`extract_filings` reads "Extract filings"). The snapshot stays the only source of progress: the registry names things, it never says how far the run has got.

**The registry must be the version that ran.** The style joins the registry to the snapshot by step number, and a step number holds only within one version of a method, so a registry of a draft edited after the run started can name steps the run will not take.

**What it draws:**

- **The headline** says where the run stands in words, never the contract's `summary`, which names pipe codes: "Waiting to start", "Working on it · 1m 20s", "Done · 1m 42s", "Failed in Summarize a filing · 35s", "Canceled · 40s", or "No progress was recorded" for a run that ended before anything started. The elapsed time is in the lines' own format.
- **The entry sequence's steps** are the top-level lines. A step that ended shows its duration, a running one its elapsed time, in a quiet tone.
- **Steps the run has not reached** are listed from the registry, dimmed, while their sequence runs, so a run that has not started yet already shows its plan. When the sequence failed or was canceled they stay, marked "Not run". Without a registry none is listed, not even as a count, because a sequence's `step_count` includes binding steps that never run as invocations.
- **A batch is one line**, titled by the pipe each item runs and marked "for each" with the batch's item name ("Summarize a filing · for each filing"). Under it, a bar and the counts in words: "1 of 3 done · 2 in progress". The contract counts a skipped item as done, so the style counts skipped items apart ("22 of 24 done · 1 failed · 1 skipped") and the parts always add up to the total. Opened, it shows the branch's own steps once each, with how many items stand at each state, never one line per item.
- **A decision** shows the outcome it took after its title ("Decide how deep to check → Detailed", "→ Default" for the default outcome). A dry run's condition resolves nothing and runs every branch, so each branch is labelled with the outcome it stands for.
- **A parallel** is marked "at the same time". One wider than `wideParallelThreshold` (`DEFAULT_WIDE_PARALLEL_THRESHOLD` by default) folds its finished branches into one "N done" line.
- **Only the active path unfolds.** A group's children are drawn while it runs or is in trouble and folded once it has ended, so a finished part of the run reads as one line; the reader can open or close any group, and the timeline remembers the choice per line for as long as it draws the same run. Indentation stops `SIMPLE_MAX_DEPTH` levels below the top, and deeper work shows as one "Now:" line naming the deepest running step.
- **Health reads as plain phrases** on the nearest drawn line. A step being tried again reads "Trying again (attempt 2)"; a line counting items reads "Trying again for 1 filing". Where the run is stuck it reads "Having trouble here. Still trying; the run fails if this lasts past 09:45.", the time being the degradation's `ends_at` in the reader's clock, or "Still trying." when it has none; the platform's own message is under "Details". A step that recovered reads as done and nothing more. The entry sequence has no line, so its own retry reads under the headline: "The run is trying again (attempt 2)."
- **A failure** is shown once, on the deepest drawn line holding it, with its problem's `title`, and its `detail` and next step under "Details". When no drawn line holds it, it shows under the headline.
- **The run's own degradation** reads as a note under the headline: "Progress may be out of date: the run can't be reached right now." when the platform could not read the run, and its message under "Details" for a reason the style does not know.

**For a screen reader**, each mark carries its state in words, a batch's bar is a `progressbar` whose value text is its counts, and a polite live region announces what changed between two snapshots: a top-level step starting, ending or failing, and the run's end in the headline's words. It announces nothing on a snapshot that changed none of them.

**Its clock** ticks once a second, since nothing it draws moves continuously; the detailed style's ticks four times a second for its growing bars. Both follow the rules in [run-timeline.md](run-timeline.md#props), "The reading clock".

**Its phrases** are English, in one table (`simpleProgressStrings.ts`), each a string or a function of the values it carries rather than a sentence assembled from fragments, so another language can order its words its own way. A host cannot pass its own table yet.

## The projection

The view draws `buildSimpleProgress(snapshot, options)`, exported from the React-free `./timeline`: a tree of lines, each with its kind (`SIMPLE_LINE_KIND`), state (`SIMPLE_LINE_STATE`: upcoming, running, done, failed, skipped, stopped, never run), title, outcome, counts, tally and health, plus the run's note, the entry sequence's retry and where a failed run failed, as data and never as a sentence. A host can read it to word a run's progress elsewhere, such as in a notification. `simpleProgressChanges(previous, current)` gives what changed between two readings, which is what the live region announces. Both are unit-tested as input to output in `src/timeline/styles/__tests__/`.

## Styling

The simple style draws inside the timeline's container, so it takes the palette and `paletteColors` the same way ([run-timeline.md](run-timeline.md#styling)). Its rules are in `SimpleProgress.css`, imported by the `./timeline/react` entry, and its layout variable is `--mthds-simple-progress-indent`, each nesting level's indent. Below 560 pixels of width a batch's bar and counts wrap under each other. The running mark spins and the bar's segments glide, both stilled under `prefers-reduced-motion`.

## Adding a style

Add an id to `TIMELINE_STYLE`; the compiler then names every table keyed by `TimelineStyleId` that needs a row: its descriptor in `TIMELINE_STYLES`, its menu icon in `TIMELINE_STYLE_MENU_ENTRIES`, and the view `RunTimeline` draws it with.

## The stories

`make storybook` and open **Timeline / RunTimeline / Simple** for the simple style: the recorded runs replayed, the contract's worked example opened and closed, in the light theme and narrow, a wide batch replayed and failed, a run waiting to start, a run with no registry, a canceled run, a dry run's condition, a host's palette, a wide parallel, deep nesting and the live region's announcements. **Timeline / RunTimeline / Style menu** covers the menu: choosing a style, a live run switched away and back with its clock and what the reader opened kept, the menu in the light theme, no menu, and a host driving the style itself. Their play functions are the browser tests, and `SimpleProgress.screenshot.tsx` holds the simple style's pictures to committed references (`make test-screenshots`).
