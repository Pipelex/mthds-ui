import * as React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import type { TimelineStyleId } from "@timeline/styles/timelineStyles";
import { RunTimeline } from "../RunTimeline";
import { REVIEW_FILINGS_REGISTRY } from "./methodRegistries";
import { WORKED_EXAMPLE_SNAPSHOT } from "./recordedRuns";

/**
 * The timeline header's style menu: opt-in with `styleMenu`, the graph
 * viewer's menu over the timeline's styles, reporting a choice through
 * `onTimelineStyleChange`. Each story's play test drives one behavior.
 */
const meta: Meta<typeof RunTimeline> = {
  title: "Timeline/RunTimeline/Style menu",
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
    snapshot: WORKED_EXAMPLE_SNAPSHOT,
    live: false,
    pipeRegistry: REVIEW_FILINGS_REGISTRY,
    entryPipeRef: "filings.review_filings",
    styleMenu: true,
    onTimelineStyleChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof RunTimeline>;

const MENU_BUTTON = /^Timeline style: /;

/** Which style the timeline draws, read from what only that style draws. */
function drawnStyle(canvasElement: HTMLElement): TimelineStyleId | null {
  if (canvasElement.querySelector(".mthds-simple-progress")) return "simple";
  if (canvasElement.querySelector(".mthds-run-timeline-rows")) return "detailed";
  return null;
}

async function chooseStyle(canvasElement: HTMLElement, name: string) {
  const canvas = within(canvasElement);
  await userEvent.click(canvas.getByRole("button", { name: MENU_BUTTON }));
  const menu = await canvas.findByRole("menu", { name: "Timeline style" });
  await userEvent.click(within(menu).getByRole("menuitemradio", { name: new RegExp(name) }));
}

export const ChooseAStyle: Story = {
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(drawnStyle(canvasElement)).toBe("detailed"));
    // Nothing is reported on mount.
    expect(args.onTimelineStyleChange).not.toHaveBeenCalled();

    const button = canvas.getByRole("button", { name: /^Timeline style: Detailed/ });
    await userEvent.click(button);
    expect(button).toHaveAttribute("aria-expanded", "true");
    const menu = await canvas.findByRole("menu", { name: "Timeline style" });

    // Every style, by name and description, the current one checked.
    const items = within(menu).getAllByRole("menuitemradio");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Detailed");
    expect(items[0]).toHaveTextContent("Every pipe, with a bar on a time axis");
    expect(items[0]).toHaveAttribute("aria-checked", "true");
    expect(items[1]).toHaveTextContent("Simple");
    expect(items[1]).toHaveAttribute("aria-checked", "false");
    await waitFor(() => expect(items[0]).toHaveFocus());

    // Choosing redraws the run, closes the menu and reports the choice once.
    await userEvent.click(items[1]);
    await waitFor(() => expect(drawnStyle(canvasElement)).toBe("simple"));
    expect(canvas.queryByRole("menu")).toBeNull();
    expect(args.onTimelineStyleChange).toHaveBeenCalledTimes(1);
    expect(args.onTimelineStyleChange).toHaveBeenCalledWith("simple");
    expect(canvas.getByRole("button", { name: /^Timeline style: Simple/ })).toBeInTheDocument();

    // And back.
    await chooseStyle(canvasElement, "Detailed");
    await waitFor(() => expect(drawnStyle(canvasElement)).toBe("detailed"));
    expect(args.onTimelineStyleChange).toHaveBeenLastCalledWith("detailed");
  },
};

/** The menu in the light theme, opened: it takes the timeline's palette. */
export const OpenedLight: Story = {
  args: { theme: "light", timelineStyle: "simple" },
  decorators: [
    (Story) => (
      <div style={{ background: "#f1f5f9", padding: 16, minHeight: 320 }}>
        <Story />
      </div>
    ),
  ],
  play: async ({ canvasElement }) => {
    const canvas = within(canvasElement);
    await userEvent.click(await canvas.findByRole("button", { name: MENU_BUTTON }));
    await expect(await canvas.findByRole("menu", { name: "Timeline style" })).toBeInTheDocument();
  },
};

/** No `styleMenu`, no menu; and a list naming one style offers nothing to choose between. */
export const NoMenu: Story = {
  args: { styleMenu: undefined },
  render: (args) => (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <RunTimeline {...args} />
      <RunTimeline {...args} styleMenu={["simple"]} timelineStyle="simple" />
    </div>
  ),
  play: async ({ canvasElement }) => {
    await waitFor(() =>
      expect(canvasElement.querySelectorAll("section.mthds-run-timeline")).toHaveLength(2),
    );
    expect(within(canvasElement).queryByRole("button", { name: MENU_BUTTON })).toBeNull();
  },
};

/**
 * A host that drives the style itself: the prop is adopted whenever it
 * changes, the menu changes the style in between, and clearing the prop hands
 * the style back to the default.
 */
function HostDriven(props: React.ComponentProps<typeof RunTimeline>) {
  const [style, setStyle] = React.useState<TimelineStyleId | undefined>("simple");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
      <div style={{ display: "flex", gap: 8 }}>
        <button type="button" onClick={() => setStyle("detailed")}>
          Host: detailed
        </button>
        <button type="button" onClick={() => setStyle("simple")}>
          Host: simple
        </button>
        <button type="button" onClick={() => setStyle(undefined)}>
          Host: clear
        </button>
      </div>
      <RunTimeline {...props} timelineStyle={style} />
    </div>
  );
}

export const HostDrivenStyle: Story = {
  render: (args) => <HostDriven {...args} />,
  play: async ({ canvasElement, args }) => {
    const canvas = within(canvasElement);
    await waitFor(() => expect(drawnStyle(canvasElement)).toBe("simple"));
    expect(args.onTimelineStyleChange).not.toHaveBeenCalled();

    // The menu changes the style the host passed.
    await chooseStyle(canvasElement, "Detailed");
    await waitFor(() => expect(drawnStyle(canvasElement)).toBe("detailed"));
    expect(args.onTimelineStyleChange).toHaveBeenLastCalledWith("detailed");

    // A prop that changes is adopted, and reported.
    await userEvent.click(canvas.getByRole("button", { name: "Host: detailed" }));
    await userEvent.click(canvas.getByRole("button", { name: "Host: simple" }));
    await waitFor(() => expect(drawnStyle(canvasElement)).toBe("simple"));
    expect(args.onTimelineStyleChange).toHaveBeenLastCalledWith("simple");

    // Cleared, the style is the default.
    await userEvent.click(canvas.getByRole("button", { name: "Host: clear" }));
    await waitFor(() => expect(drawnStyle(canvasElement)).toBe("detailed"));
    expect(args.onTimelineStyleChange).toHaveBeenLastCalledWith("detailed");
  },
};
