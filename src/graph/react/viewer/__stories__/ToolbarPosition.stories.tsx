import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, within } from "storybook/test";
import { TOOLBAR_POSITION, toolbarOrientation, type ToolbarPosition } from "@graph/types";
import { GraphViewer } from "../GraphViewer";
import { waitForGraphRender } from "./storyTestUtils";
import { LIVE_CV_SCREENING } from "./pipelines/specs/_generated/live/pipeline_09";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph/ToolbarPosition",
  component: GraphViewer,
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "100vh", position: "relative" }}>
        <Story />
      </div>
    ),
  ],
  argTypes: {
    // Single select over the anchors. Orientation is derived from the chosen
    // value — the corners + top/bottom-center render a horizontal bar,
    // center-left / center-right a vertical one.
    toolbarPosition: {
      control: "select",
      options: Object.values(TOOLBAR_POSITION),
    },
  },
};

export default meta;
type Story = StoryObj<typeof GraphViewer>;

// CV-screening is a controller-heavy pipeline, so the toolbar shows its full
// button set (fold/expand + controllers + direction + zoom + theme) — the best
// stress case for the horizontal/vertical orientation switch.
const SPEC = LIVE_CV_SCREENING;
const BASE = { graphspec: SPEC, initialShowControllers: true } as const;

// ─── Helpers ────────────────────────────────────────────────────────────

/** The ReactFlow <Panel> renders its anchor as a class on the panel element. */
function toolbarPanel(canvasElement: HTMLElement): HTMLElement | null {
  return canvasElement.querySelector(".graph-toolbar-panel");
}

/**
 * ReactFlow splits the anchor on `-` into separate classes (`top-right` →
 * `top` + `right`), so assert each segment is present on the panel element.
 */
function panelHasAnchor(panel: HTMLElement, position: ToolbarPosition): boolean {
  return position.split("-").every((segment) => panel.classList.contains(segment));
}

// ─── Interactive playground — flip `toolbarPosition` from the controls ─────

export const Playground: Story = {
  args: { ...BASE, toolbarPosition: TOOLBAR_POSITION.TOP_RIGHT },
  play: async ({ canvasElement }) => {
    await waitForGraphRender(canvasElement);
    const canvas = within(canvasElement);

    // The toolbar renders inside the ReactFlow pane (it needs <Panel> context).
    // ReactFlow may place nodes off-viewport, so assert presence, not visibility.
    const toolbar = canvas.getByLabelText(/Switch to (horizontal|vertical) layout/);
    expect(toolbar).toBeInTheDocument();

    // Default arg is top-right → horizontal bar anchored top-right.
    const panel = toolbarPanel(canvasElement);
    expect(panel).not.toBeNull();
    expect(panelHasAnchor(panel!, TOOLBAR_POSITION.TOP_RIGHT)).toBe(true);
    expect(canvasElement.querySelector(".graph-toolbar--horizontal")).not.toBeNull();
  },
};

// ─── One story per anchor for quick visual verification ────────────────────

function positionStory(position: ToolbarPosition): Story {
  return {
    args: { ...BASE, toolbarPosition: position },
    play: async ({ canvasElement }) => {
      await waitForGraphRender(canvasElement);
      const panel = toolbarPanel(canvasElement);
      expect(panel).not.toBeNull();
      // ReactFlow applies the anchor as split classes on the panel element.
      expect(panelHasAnchor(panel!, position)).toBe(true);
      // The inner bar carries the derived orientation class.
      const orientation = toolbarOrientation(position);
      expect(canvasElement.querySelector(`.graph-toolbar--${orientation}`)).not.toBeNull();
    },
  };
}

export const TopLeft = positionStory(TOOLBAR_POSITION.TOP_LEFT);
export const TopCenter = positionStory(TOOLBAR_POSITION.TOP_CENTER);
export const TopRight = positionStory(TOOLBAR_POSITION.TOP_RIGHT);
export const BottomLeft = positionStory(TOOLBAR_POSITION.BOTTOM_LEFT);
export const BottomCenter = positionStory(TOOLBAR_POSITION.BOTTOM_CENTER);
export const BottomRight = positionStory(TOOLBAR_POSITION.BOTTOM_RIGHT);
export const CenterLeftVertical = positionStory(TOOLBAR_POSITION.CENTER_LEFT);
export const CenterRightVertical = positionStory(TOOLBAR_POSITION.CENTER_RIGHT);
