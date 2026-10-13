import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, userEvent, waitFor } from "storybook/test";
import {
  TOOLBAR_POSITION,
  toolbarOrientation,
  type ToolbarPosition,
  type ValidationIssue,
} from "@graph/types";
import {
  CONTRACTS_CV_SCREENING,
  INPUT_FORM_CV_SCREENING,
  OUTPUT_FORM_CV_SCREENING,
} from "@form/react/__stories__/contracts/_generated.contracts";
import { GraphViewer } from "../GraphViewer";
import { waitForGraphRender } from "./storyTestUtils";
import { LIVE_CV_SCREENING } from "./pipelines/specs/_generated/live/pipeline_09";

/**
 * The viewer's own controls at a phone's width and at a desktop's.
 *
 * Below 640px every toolbar button (the style menu's trigger and the validation
 * button among them) and the detail panel's close button must take taps over at
 * least 44×44, the size a fingertip needs; above it they keep their desktop
 * sizes. The phone stories run at 375×844 and measure each control's hit area:
 * its box, joined with its `::after` when the stylesheet extends it with one,
 * then probe that area's edges with `elementFromPoint` so an extension hidden
 * under another layer fails too. They also hold that no two toolbar targets
 * overlap, that no button leaves the viewer, and that the close button's area
 * covers none of the panel's other controls.
 */

const PHONE = "phone375";
const DESKTOP = "desktop1280";
const MIN_TARGET_PX = 44;
const DESKTOP_TOOLBAR_BUTTON_PX = 28;
const DESKTOP_CLOSE_BUTTON_PX = 24;

const ISSUES: ValidationIssue[] = [
  {
    severity: "warning",
    message: "Pipe declares an input that no step consumes.",
    context: "pipe.screen_cv.inputs",
    origin: "validator",
  },
];

const meta: Meta<typeof GraphViewer> = {
  title: "Misc/Touch targets",
  component: GraphViewer,
  parameters: {
    layout: "fullscreen",
    viewport: {
      options: {
        [PHONE]: {
          name: "Phone 375×844",
          styles: { width: "375px", height: "844px" },
          type: "mobile",
        },
        [DESKTOP]: {
          name: "Desktop 1280×800",
          styles: { width: "1280px", height: "800px" },
          type: "desktop",
        },
      },
    },
  },
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "100vh", position: "relative" }}>
        <Story />
      </div>
    ),
  ],
  // Every control the toolbar can show: validation, the style menu, fold and
  // expand all, controller frames, direction, zoom, fit and theme. The graph
  // carries its descriptors, so a data node's panel holds the kernel's controls.
  args: {
    graph: {
      graphSpec: LIVE_CV_SCREENING,
      pipeIoContracts: CONTRACTS_CV_SCREENING,
      inputForm: INPUT_FORM_CV_SCREENING,
      outputForm: OUTPUT_FORM_CV_SCREENING,
    },
    initialShowControllers: true,
    styleMenu: true,
    validationState: "invalid",
    validationIssues: ISSUES,
  },
};

export default meta;
type Story = StoryObj<typeof GraphViewer>;

const PHONE_GLOBALS = { viewport: { value: PHONE, isRotated: false } };
const DESKTOP_GLOBALS = { viewport: { value: DESKTOP, isRotated: false } };

// ─── Measuring ────────────────────────────────────────────────────────────

interface Box {
  left: number;
  top: number;
  right: number;
  bottom: number;
}

const width = (box: Box): number => box.right - box.left;
const height = (box: Box): number => box.bottom - box.top;

function overlaps(a: Box, b: Box): boolean {
  return a.left < b.right && b.left < a.right && a.top < b.bottom && b.top < a.bottom;
}

/**
 * The area a tap on `el` lands in: its border box, joined with its `::after`
 * when that is an absolutely positioned extension of it. The pseudo-element's
 * edges are read from its insets, against the padding box it is positioned in.
 */
function hitBox(el: HTMLElement): Box {
  const rect = el.getBoundingClientRect();
  const box: Box = { left: rect.left, top: rect.top, right: rect.right, bottom: rect.bottom };
  const after = getComputedStyle(el, "::after");
  if (after.content === "none" || after.position !== "absolute") return box;
  const paddingLeft = rect.left + el.clientLeft;
  const paddingTop = rect.top + el.clientTop;
  return {
    left: Math.min(box.left, paddingLeft + parseFloat(after.left)),
    top: Math.min(box.top, paddingTop + parseFloat(after.top)),
    right: Math.max(box.right, paddingLeft + el.clientWidth - parseFloat(after.right)),
    bottom: Math.max(box.bottom, paddingTop + el.clientHeight - parseFloat(after.bottom)),
  };
}

/** The four edge midpoints of a box, a pixel inside it, and its centre. */
function probePoints(box: Box): [number, number][] {
  const midX = (box.left + box.right) / 2;
  const midY = (box.top + box.bottom) / 2;
  return [
    [midX, midY],
    [box.left + 1, midY],
    [box.right - 1, midY],
    [midX, box.top + 1],
    [midX, box.bottom - 1],
  ];
}

/** A tap anywhere in `box` reaches `el`: nothing stacked above takes it first. */
function expectTapsReach(el: HTMLElement, box: Box, label: string): void {
  for (const [x, y] of probePoints(box)) {
    const hit = document.elementFromPoint(x, y);
    expect(hit && el.contains(hit), `${label}: a tap at (${x}, ${y}) lands on it`).toBe(true);
  }
}

function expectTouchSized(el: HTMLElement, label: string): Box {
  const box = hitBox(el);
  expect(width(box), `${label}: hit width`).toBeGreaterThanOrEqual(MIN_TARGET_PX);
  expect(height(box), `${label}: hit height`).toBeGreaterThanOrEqual(MIN_TARGET_PX);
  expectTapsReach(el, box, label);
  return box;
}

function labelOf(el: HTMLElement): string {
  return el.getAttribute("aria-label") ?? el.className;
}

function toolbarButtons(canvasElement: HTMLElement): HTMLElement[] {
  return Array.from(canvasElement.querySelectorAll<HTMLElement>(".graph-toolbar-btn"));
}

function closeButton(canvasElement: HTMLElement): HTMLElement {
  const close = canvasElement.querySelector<HTMLElement>(".detail-panel-close");
  if (!close) throw new Error("no detail panel close button");
  return close;
}

/** Whatever in the open panel takes a tap, other than the close button. */
function panelControls(canvasElement: HTMLElement): HTMLElement[] {
  const panel = canvasElement.querySelector<HTMLElement>(".detail-panel-content");
  if (!panel) throw new Error("no detail panel");
  const selector = [
    "button",
    "a[href]",
    "input",
    "select",
    "textarea",
    "summary",
    '[role="button"]',
    '[role="tab"]',
    '[tabindex]:not([tabindex="-1"])',
    ".detail-io-pill",
  ].join(", ");
  return Array.from(panel.querySelectorAll<HTMLElement>(selector)).filter(
    (el) => !el.classList.contains("detail-panel-close") && el.getClientRects().length > 0,
  );
}

/** Wait for the panel's slide-in to finish, so its controls are measured in place. */
async function waitForOpenPanel(canvasElement: HTMLElement): Promise<void> {
  await waitFor(() => {
    const panel = canvasElement.querySelector<HTMLElement>(".detail-panel");
    expect(panel).not.toHaveClass("detail-panel--closed");
    const container = canvasElement.querySelector<HTMLElement>(".react-flow-container");
    expect(panel!.getBoundingClientRect().right).toBeCloseTo(
      container!.getBoundingClientRect().right,
      0,
    );
  });
}

async function openNode(canvasElement: HTMLElement, selector: string): Promise<void> {
  await waitForGraphRender(canvasElement);
  const node = canvasElement.querySelector<HTMLElement>(selector);
  if (!node) throw new Error(`no node matching ${selector}`);
  await userEvent.click(node);
  await waitForOpenPanel(canvasElement);
}

// ─── Phone: the toolbar ───────────────────────────────────────────────────

/**
 * The full toolbar at `position` on a phone. With `viewerHeight`, the viewer is
 * that short, so an edge anchor's column must wrap to stay inside it.
 */
function phoneToolbarStory(position: ToolbarPosition, viewerHeight?: number): Story {
  return {
    globals: PHONE_GLOBALS,
    args: { toolbarPosition: position },
    decorators: viewerHeight
      ? [
          (Story) => (
            <div style={{ height: viewerHeight, position: "relative" }}>
              <Story />
            </div>
          ),
        ]
      : [],
    play: async ({ canvasElement }) => {
      await waitForGraphRender(canvasElement);
      expect(window.innerWidth).toBe(375);
      const buttons = toolbarButtons(canvasElement);
      // Validation, style, fold, expand, frames, direction, out, in, fit, theme.
      expect(buttons).toHaveLength(10);
      const viewer = canvasElement.querySelector<HTMLElement>(".react-flow")!;
      const bounds = viewer.getBoundingClientRect();

      const boxes = buttons.map((button) => expectTouchSized(button, labelOf(button)));
      boxes.forEach((box, i) => {
        // The bar wraps rather than running off the viewer.
        expect(box.left, `${labelOf(buttons[i])}: inside the viewer`).toBeGreaterThanOrEqual(
          bounds.left,
        );
        expect(box.right, `${labelOf(buttons[i])}: inside the viewer`).toBeLessThanOrEqual(
          bounds.right,
        );
        expect(box.top, `${labelOf(buttons[i])}: inside the viewer`).toBeGreaterThanOrEqual(
          bounds.top,
        );
        expect(box.bottom, `${labelOf(buttons[i])}: inside the viewer`).toBeLessThanOrEqual(
          bounds.bottom,
        );
        // No target takes a neighbour's taps.
        boxes.slice(i + 1).forEach((other, j) => {
          expect(
            overlaps(box, other),
            `${labelOf(buttons[i])} overlaps ${labelOf(buttons[i + 1 + j])}`,
          ).toBe(false);
        });
      });
      // A row bar is wider than a phone, so it has wrapped into a second row;
      // a column wraps only in a viewer too short for it.
      const lines = new Set(
        boxes.map((box) => (toolbarOrientation(position) === "horizontal" ? box.top : box.left)),
      );
      const wraps = toolbarOrientation(position) === "horizontal" || viewerHeight !== undefined;
      expect(lines.size > 1, "the bar wrapped").toBe(wraps);
    },
  };
}

export const PhoneToolbarTopRight = phoneToolbarStory(TOOLBAR_POSITION.TOP_RIGHT);
export const PhoneToolbarTopCenter = phoneToolbarStory(TOOLBAR_POSITION.TOP_CENTER);
export const PhoneToolbarBottomLeft = phoneToolbarStory(TOOLBAR_POSITION.BOTTOM_LEFT);
export const PhoneToolbarCenterLeft = phoneToolbarStory(TOOLBAR_POSITION.CENTER_LEFT);
export const PhoneToolbarCenterRight = phoneToolbarStory(TOOLBAR_POSITION.CENTER_RIGHT);
export const PhoneToolbarCenterLeftShortViewer = phoneToolbarStory(
  TOOLBAR_POSITION.CENTER_LEFT,
  420,
);
export const PhoneToolbarCenterRightShortViewer = phoneToolbarStory(
  TOOLBAR_POSITION.CENTER_RIGHT,
  420,
);

// ─── Phone: the detail panel's close button ───────────────────────────────

function phoneCloseStory(nodeSelector: string): Story {
  return {
    globals: PHONE_GLOBALS,
    play: async ({ canvasElement }) => {
      await openNode(canvasElement, nodeSelector);
      const close = closeButton(canvasElement);
      const box = expectTouchSized(close, "Close panel");
      for (const control of panelControls(canvasElement)) {
        expect(
          overlaps(box, control.getBoundingClientRect()),
          `the close button's area covers ${labelOf(control)}`,
        ).toBe(false);
      }
      // The area is invisible: the button still looks 24×24.
      const rect = close.getBoundingClientRect();
      expect(rect.width).toBe(DESKTOP_CLOSE_BUTTON_PX);
      expect(rect.height).toBe(DESKTOP_CLOSE_BUTTON_PX);

      await userEvent.click(close);
      await waitFor(() =>
        expect(canvasElement.querySelector(".detail-panel")).toHaveClass("detail-panel--closed"),
      );
    },
  };
}

/** A pipe's panel: the badge and code share the close button's line, the cost button below. */
export const PhonePipePanelClose = phoneCloseStory(".react-flow__node-pipeCard");

/** A data node's panel: the Data and Structure tabs, then the kernel's result controls. */
export const PhoneDataPanelClose = phoneCloseStory('.react-flow__node[data-id*="stuff_"]');

// ─── Desktop: the sizes are unchanged ─────────────────────────────────────

export const DesktopSizesUnchanged: Story = {
  globals: DESKTOP_GLOBALS,
  play: async ({ canvasElement }) => {
    await openNode(canvasElement, ".react-flow__node-pipeCard");
    expect(window.innerWidth).toBe(1280);
    for (const button of toolbarButtons(canvasElement)) {
      const box = hitBox(button);
      expect(width(box), labelOf(button)).toBe(DESKTOP_TOOLBAR_BUTTON_PX);
      expect(height(box), labelOf(button)).toBe(DESKTOP_TOOLBAR_BUTTON_PX);
    }
    const close = closeButton(canvasElement);
    expect(getComputedStyle(close, "::after").content).toBe("none");
    const box = hitBox(close);
    expect(width(box)).toBe(DESKTOP_CLOSE_BUTTON_PX);
    expect(height(box)).toBe(DESKTOP_CLOSE_BUTTON_PX);
  },
};
