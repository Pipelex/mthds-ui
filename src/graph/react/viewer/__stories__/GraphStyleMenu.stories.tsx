import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, fn, userEvent, waitFor, within } from "storybook/test";
import { GRAPH_STYLE, TOOLBAR_POSITION, type ToolbarPosition } from "@graph/types";
import { makeNestedSpec } from "@graph/__tests__/testUtils";
import { GraphViewer } from "../GraphViewer";
import { validationPanelPlacement } from "../ValidationPanel";
import { waitForGraphRender } from "./storyTestUtils";
import { STATIC_CV_SCREENING } from "./staticGraphSpec";

/**
 * The toolbar's style menu: opt-in with `styleMenu`, a list of styles with
 * their names and descriptions, reporting a choice through
 * `onGraphStyleChange`. Each story's play test drives one behavior.
 */
const meta: Meta<typeof GraphViewer> = {
  title: "Graph - styles/Style menu",
  component: GraphViewer,
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "100vh", position: "relative" }}>
        <Story />
      </div>
    ),
  ],
  args: {
    graph: { graphSpec: STATIC_CV_SCREENING },
    styleMenu: true,
    onGraphStyleChange: fn(),
  },
};

export default meta;
type Story = StoryObj<typeof GraphViewer>;

const MENU_BUTTON = /^Graph style: /;

async function openMenu(canvasElement: HTMLElement) {
  await waitForGraphRender(canvasElement);
  const canvas = within(canvasElement);
  const button = canvas.getByRole("button", { name: MENU_BUTTON });
  await userEvent.click(button);
  const menu = await canvas.findByRole("menu", { name: "Graph style" });
  return { canvas, button, menu };
}

function simpleNodeCount(canvasElement: HTMLElement): number {
  return canvasElement.querySelectorAll(".react-flow__node-simpleStep").length;
}

export const ChooseAStyle: Story = {
  play: async ({ canvasElement, args }) => {
    const { canvas, button, menu } = await openMenu(canvasElement);
    expect(button).toHaveAttribute("aria-expanded", "true");

    // Every style, by name and description, the current one checked.
    const items = within(menu).getAllByRole("menuitemradio");
    expect(items).toHaveLength(2);
    expect(items[0]).toHaveTextContent("Detailed");
    expect(items[0]).toHaveTextContent("Every pipe with its inputs, outputs and settings");
    expect(items[0]).toHaveAttribute("aria-checked", "true");
    expect(items[1]).toHaveTextContent("Simple");
    expect(items[1]).toHaveAttribute("aria-checked", "false");
    // Focus lands on the checked item.
    await waitFor(() => expect(items[0]).toHaveFocus());

    // Choosing redraws the graph, closes the menu and reports the choice.
    expect(simpleNodeCount(canvasElement)).toBe(0);
    await userEvent.click(items[1]);
    expect(args.onGraphStyleChange).toHaveBeenCalledWith("simple");
    expect(canvas.queryByRole("menu")).toBeNull();
    await waitFor(() => expect(simpleNodeCount(canvasElement)).toBeGreaterThan(0));
    expect(canvas.getByRole("button", { name: /^Graph style: Simple/ })).toBeInTheDocument();
    // The simple style has no controller frames to toggle.
    expect(canvas.queryByRole("button", { name: /pipe controllers/ })).toBeNull();
  },
};

async function chooseStyle(canvasElement: HTMLElement, name: string) {
  const { menu } = await openMenu(canvasElement);
  await userEvent.click(within(menu).getByRole("menuitemradio", { name: new RegExp(name) }));
}

function foldedCardCount(canvasElement: HTMLElement): number {
  return canvasElement.querySelectorAll(".pipe-card--controller").length;
}

export const SwitchKeepsTheReadersFolds: Story = {
  args: { initialShowControllers: true },
  play: async ({ canvasElement }) => {
    await waitForGraphRender(canvasElement);
    expect(foldedCardCount(canvasElement)).toBe(0);
    const foldButton = await waitFor(() => {
      const button = canvasElement.querySelector<HTMLElement>(".controller-group-fold");
      expect(button).not.toBeNull();
      return button!;
    });
    await userEvent.click(foldButton);
    await waitFor(() => expect(foldedCardCount(canvasElement)).toBeGreaterThan(0));
    const folded = foldedCardCount(canvasElement);

    // To the simple style and back: the controller the reader folded is still folded.
    await chooseStyle(canvasElement, "Simple");
    await waitFor(() => expect(simpleNodeCount(canvasElement)).toBeGreaterThan(0));
    await chooseStyle(canvasElement, "Detailed");
    await waitFor(() => expect(simpleNodeCount(canvasElement)).toBe(0));
    await waitFor(() => expect(foldedCardCount(canvasElement)).toBe(folded));
  },
};

/** Four sequences deep: the simple style folds the innermost one by itself. */
export const SwitchSwapsTheStylesOwnFolds: Story = {
  args: {
    graph: { graphSpec: makeNestedSpec(4) },
    config: { graphStyle: GRAPH_STYLE.SIMPLE },
    initialShowControllers: true,
  },
  play: async ({ canvasElement }) => {
    await waitForGraphRender(canvasElement);
    await waitFor(() => expect(simpleNodeCount(canvasElement)).toBeGreaterThan(0));

    // The detailed style folds nothing by itself, so nothing stays folded.
    await chooseStyle(canvasElement, "Detailed");
    await waitFor(() => expect(simpleNodeCount(canvasElement)).toBe(0));
    await waitFor(() =>
      expect(canvasElement.querySelectorAll(".controller-group-node").length).toBe(4),
    );
    expect(foldedCardCount(canvasElement)).toBe(0);
  },
};

function openButtons(canvasElement: HTMLElement): HTMLElement[] {
  return Array.from(canvasElement.querySelectorAll<HTMLElement>(".simple-step-open"));
}

/** The reader opens the sub-method the simple style folded: it stays open across a switch. */
export const SwitchKeepsWhatTheReaderOpened: Story = {
  args: SwitchSwapsTheStylesOwnFolds.args,
  play: async ({ canvasElement }) => {
    await waitForGraphRender(canvasElement);
    await waitFor(() => expect(openButtons(canvasElement)).toHaveLength(1));
    await userEvent.click(openButtons(canvasElement)[0]!);
    await waitFor(() => expect(openButtons(canvasElement)).toHaveLength(0));

    await chooseStyle(canvasElement, "Detailed");
    await waitFor(() => expect(simpleNodeCount(canvasElement)).toBe(0));
    await chooseStyle(canvasElement, "Simple");
    await waitFor(() => expect(simpleNodeCount(canvasElement)).toBeGreaterThan(0));
    expect(openButtons(canvasElement)).toHaveLength(0);
  },
};

/** Expand-all is the reader opening everything: a switch there and back keeps it open. */
export const SwitchKeepsWhatTheReaderExpanded: Story = {
  args: SwitchSwapsTheStylesOwnFolds.args,
  play: async ({ canvasElement }) => {
    await waitForGraphRender(canvasElement);
    await waitFor(() => expect(openButtons(canvasElement)).toHaveLength(1));
    const canvas = within(canvasElement);
    await userEvent.click(canvas.getByRole("button", { name: "Expand all controllers" }));
    await waitFor(() => expect(openButtons(canvasElement)).toHaveLength(0));

    await chooseStyle(canvasElement, "Detailed");
    await waitFor(() => expect(simpleNodeCount(canvasElement)).toBe(0));
    await chooseStyle(canvasElement, "Simple");
    await waitFor(() => expect(simpleNodeCount(canvasElement)).toBeGreaterThan(0));
    expect(openButtons(canvasElement)).toHaveLength(0);
  },
};

export const KeyboardOnly: Story = {
  play: async ({ canvasElement, args }) => {
    const { canvas, menu } = await openMenu(canvasElement);
    const items = within(menu).getAllByRole("menuitemradio");
    await waitFor(() => expect(items[0]).toHaveFocus());
    await userEvent.keyboard("{ArrowDown}");
    expect(items[1]).toHaveFocus();
    await userEvent.keyboard("{ArrowDown}");
    expect(items[0]).toHaveFocus();
    await userEvent.keyboard("{End}");
    expect(items[1]).toHaveFocus();
    await userEvent.keyboard("{Enter}");
    expect(args.onGraphStyleChange).toHaveBeenCalledWith("simple");
    expect(canvas.queryByRole("menu")).toBeNull();
  },
};

export const EscapeReturnsFocus: Story = {
  play: async ({ canvasElement, args }) => {
    const { canvas, button } = await openMenu(canvasElement);
    await userEvent.keyboard("{Escape}");
    expect(canvas.queryByRole("menu")).toBeNull();
    expect(button).toHaveFocus();
    expect(button).toHaveAttribute("aria-expanded", "false");
    expect(args.onGraphStyleChange).not.toHaveBeenCalled();
  },
};

export const OutsideClickCloses: Story = {
  play: async ({ canvasElement, args }) => {
    const { canvas } = await openMenu(canvasElement);
    const pane = canvasElement.querySelector(".react-flow__pane");
    if (!pane) throw new Error("no pane");
    await userEvent.click(pane);
    expect(canvas.queryByRole("menu")).toBeNull();
    expect(args.onGraphStyleChange).not.toHaveBeenCalled();
  },
};

/** A host listing one style offers no menu: there is nothing to choose between. */
export const OneStyleNoMenu: Story = {
  args: { styleMenu: ["simple"], graphStyle: "simple" },
  play: async ({ canvasElement }) => {
    await waitForGraphRender(canvasElement);
    expect(within(canvasElement).queryByRole("button", { name: MENU_BUTTON })).toBeNull();
    expect(simpleNodeCount(canvasElement)).toBeGreaterThan(0);
  },
};

/** Without `styleMenu`, the toolbar is as it was. */
export const MenuIsOptIn: Story = {
  args: { styleMenu: undefined },
  play: async ({ canvasElement }) => {
    await waitForGraphRender(canvasElement);
    expect(within(canvasElement).queryByRole("button", { name: MENU_BUTTON })).toBeNull();
  },
};

/** The host's `graphStyle` wins over config, and a host list sets the menu's order. */
export const ControlledByTheHost: Story = {
  args: {
    graphStyle: "simple",
    styleMenu: ["simple", "detailed"],
    config: { graphStyle: "detailed" },
  },
  play: async ({ canvasElement, args }) => {
    await waitFor(() => expect(simpleNodeCount(canvasElement)).toBeGreaterThan(0));
    const { menu } = await openMenu(canvasElement);
    const items = within(menu).getAllByRole("menuitemradio");
    expect(items.map((item) => item.textContent)).toEqual([
      expect.stringContaining("Simple"),
      expect.stringContaining("Detailed"),
    ]);
    expect(items[0]).toHaveAttribute("aria-checked", "true");
    expect(args.onGraphStyleChange).not.toHaveBeenCalled();
  },
};

function positionStory(position: ToolbarPosition): Story {
  return {
    args: { toolbarPosition: position },
    play: async ({ canvasElement }) => {
      const { menu } = await openMenu(canvasElement);
      expect(menu).toHaveClass(`graph-style-menu--${validationPanelPlacement(position)}`);
      // The menu opens inside the viewport, wherever the toolbar sits.
      const rect = menu.getBoundingClientRect();
      const viewport = canvasElement.getBoundingClientRect();
      expect(rect.left).toBeGreaterThanOrEqual(viewport.left - 1);
      expect(rect.right).toBeLessThanOrEqual(viewport.right + 1);
      expect(rect.top).toBeGreaterThanOrEqual(viewport.top - 1);
      expect(rect.bottom).toBeLessThanOrEqual(viewport.bottom + 1);
    },
  };
}

export const AtTopLeft = positionStory(TOOLBAR_POSITION.TOP_LEFT);
export const AtTopCenter = positionStory(TOOLBAR_POSITION.TOP_CENTER);
export const AtTopRight = positionStory(TOOLBAR_POSITION.TOP_RIGHT);
export const AtBottomLeft = positionStory(TOOLBAR_POSITION.BOTTOM_LEFT);
export const AtBottomCenter = positionStory(TOOLBAR_POSITION.BOTTOM_CENTER);
export const AtBottomRight = positionStory(TOOLBAR_POSITION.BOTTOM_RIGHT);
export const AtCenterLeft = positionStory(TOOLBAR_POSITION.CENTER_LEFT);
export const AtCenterRight = positionStory(TOOLBAR_POSITION.CENTER_RIGHT);
