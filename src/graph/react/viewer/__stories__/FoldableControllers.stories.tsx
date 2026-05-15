import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within, userEvent } from "storybook/test";
import { GraphViewer } from "../GraphViewer";
import { DRY_CV_MATCHING, LIVE_CV_SCREENING } from "./mockGraphSpec";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph/FoldableControllers",
  component: GraphViewer,
  decorators: [
    (Story) => (
      <div style={{ width: "100%", height: "100vh", position: "relative" }}>
        <Story />
      </div>
    ),
  ],
};

export default meta;
type Story = StoryObj<typeof GraphViewer>;

const SPEC = LIVE_CV_SCREENING;
const D = { initialDirection: "LR" as const, initialShowControllers: true };

// ─── Helpers ────────────────────────────────────────────────────────────

/** Wait for the ELK layout to finish and at least one node to render. */
async function waitForRender(canvasElement: HTMLElement) {
  await waitFor(
    () => {
      const nodes = canvasElement.querySelectorAll(".react-flow__node");
      expect(nodes.length).toBeGreaterThan(0);
    },
    { timeout: 5000 },
  );
  // Give a tick for fold buttons to appear after layout.
  await new Promise((r) => setTimeout(r, 100));
}

function getControllerGroupNodes(canvasElement: HTMLElement): HTMLElement[] {
  return Array.from(canvasElement.querySelectorAll(".controller-group-node")) as HTMLElement[];
}

// ─── Baseline: nothing folded ───────────────────────────────────────────

export const AllExpanded: Story = {
  args: { graphspec: SPEC, ...D },
  play: async ({ canvasElement }) => {
    await waitForRender(canvasElement);
    // At least one controller group node is rendered
    expect(getControllerGroupNodes(canvasElement).length).toBeGreaterThan(0);
  },
};

// ─── Fold/expand interaction ────────────────────────────────────────────

export const FoldAndExpand: Story = {
  args: { graphspec: SPEC, ...D },
  play: async ({ canvasElement }) => {
    await waitForRender(canvasElement);
    const initialGroups = getControllerGroupNodes(canvasElement).length;
    expect(initialGroups).toBeGreaterThan(0);

    // Click the first available fold button.
    const foldBtn = canvasElement.querySelector(".controller-group-fold") as HTMLElement | null;
    expect(foldBtn).not.toBeNull();
    await userEvent.click(foldBtn!);

    // After fold, that controller should appear as a folded pipe-card (with
    // the controller variant class). At minimum, total controller-group count
    // should drop or a pipe-card with --controller class should be present.
    await waitFor(
      () => {
        const controllerCards = canvasElement.querySelectorAll(".pipe-card--controller");
        expect(controllerCards.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    // Click the expand button on the folded card.
    const expandBtn = canvasElement.querySelector(".pipe-card-expand") as HTMLElement | null;
    expect(expandBtn).not.toBeNull();
    await userEvent.click(expandBtn!);

    // The controller group should be back.
    await waitFor(
      () => {
        const groups = getControllerGroupNodes(canvasElement).length;
        expect(groups).toBe(initialGroups);
      },
      { timeout: 5000 },
    );
  },
};

// ─── Toolbar: Fold all / Expand all ─────────────────────────────────────

export const ToolbarFoldAll: Story = {
  args: { graphspec: SPEC, ...D },
  play: async ({ canvasElement }) => {
    await waitForRender(canvasElement);
    const canvas = within(canvasElement);

    // "Fold all controllers" button exists and is enabled by default.
    const foldAllBtn = canvas.getByLabelText("Fold all controllers");
    expect(foldAllBtn).not.toBeDisabled();
    await userEvent.click(foldAllBtn);

    // After fold all: there should be folded pipe cards, no controller groups.
    await waitFor(
      () => {
        const controllerCards = canvasElement.querySelectorAll(".pipe-card--controller");
        expect(controllerCards.length).toBeGreaterThan(0);
        expect(getControllerGroupNodes(canvasElement).length).toBe(0);
      },
      { timeout: 5000 },
    );

    // "Expand all controllers" button is now enabled.
    const expandAllBtn = canvas.getByLabelText(/Expand all controllers/);
    expect(expandAllBtn).not.toBeDisabled();
    await userEvent.click(expandAllBtn);

    // After expand all: controller group nodes are back.
    await waitFor(
      () => {
        expect(getControllerGroupNodes(canvasElement).length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );
  },
};

export const ToolbarDisabledStates: Story = {
  args: { graphspec: SPEC, ...D },
  play: async ({ canvasElement }) => {
    await waitForRender(canvasElement);
    const canvas = within(canvasElement);

    // Initial state: nothing folded → "Expand all" is disabled (and has the
    // "nothing to expand" hint in its title).
    const expandAllBtn = canvas.getByLabelText(/Expand all controllers/);
    expect(expandAllBtn).toBeDisabled();
    expect(expandAllBtn.getAttribute("title")).toContain("nothing to expand");

    // "Fold all" is enabled.
    const foldAllBtn = canvas.getByLabelText("Fold all controllers");
    expect(foldAllBtn).not.toBeDisabled();

    // Click fold-all — now fold-all should disable and expand-all should enable.
    await userEvent.click(foldAllBtn);

    await waitFor(
      () => {
        const disabledFold = canvas.getByLabelText(/Fold all controllers/);
        expect(disabledFold).toBeDisabled();
        expect(disabledFold.getAttribute("title")).toContain("nothing to fold");
      },
      { timeout: 5000 },
    );
  },
};

// ─── Cousin folding: shared pipe_code across branches ──────────────────

/**
 * DRY_CV_MATCHING contains three branches each running a `route_by_match`
 * controller and a `process_single_cv` controller. A regular fold click on
 * one `route_by_match` should mirror to all three; an alt-click should only
 * affect the clicked one.
 */
export const CousinFold_MirrorsAcrossBranches: Story = {
  args: { graphspec: DRY_CV_MATCHING, ...D },
  play: async ({ canvasElement }) => {
    await waitForRender(canvasElement);
    const initialGroups = getControllerGroupNodes(canvasElement).length;
    // The spec has 8 controller groups (1 root + 1 inner-batch + 3 route_by_match + 3 process_single_cv).
    expect(initialGroups).toBeGreaterThan(3);

    // Find the first route_by_match controller's fold button.
    const firstRouteCtrl = Array.from(
      canvasElement.querySelectorAll(".controller-group-node"),
    ).find((el) => el.textContent?.includes("route_by_match")) as HTMLElement | undefined;
    expect(firstRouteCtrl).toBeDefined();
    const foldBtn = firstRouteCtrl!.querySelector(".controller-group-fold") as HTMLElement | null;
    expect(foldBtn).not.toBeNull();

    // Regular click (no alt) — fold should mirror to all cousins.
    await userEvent.click(foldBtn!);

    await waitFor(
      () => {
        // All three route_by_match controllers should now be folded cards.
        const folded = Array.from(canvasElement.querySelectorAll(".pipe-card--controller")).filter(
          (el) => el.textContent?.includes("route_by_match"),
        );
        expect(folded.length).toBe(3);
      },
      { timeout: 5000 },
    );
  },
};

export const CousinFold_AltKeyFoldsSoloOnly: Story = {
  args: { graphspec: DRY_CV_MATCHING, ...D },
  play: async ({ canvasElement }) => {
    await waitForRender(canvasElement);

    const firstRouteCtrl = Array.from(
      canvasElement.querySelectorAll(".controller-group-node"),
    ).find((el) => el.textContent?.includes("route_by_match")) as HTMLElement | undefined;
    expect(firstRouteCtrl).toBeDefined();
    const foldBtn = firstRouteCtrl!.querySelector(".controller-group-fold") as HTMLElement | null;
    expect(foldBtn).not.toBeNull();

    // Alt-click — only the clicked controller should fold. Dispatch a native
    // MouseEvent directly so altKey survives into React's synthetic event
    // (user-event's modifier-hold is unreliable across the storybook runner).
    foldBtn!.dispatchEvent(
      new MouseEvent("click", { altKey: true, bubbles: true, cancelable: true }),
    );

    await waitFor(
      () => {
        // Exactly one route_by_match should be folded.
        const folded = Array.from(canvasElement.querySelectorAll(".pipe-card--controller")).filter(
          (el) => el.textContent?.includes("route_by_match"),
        );
        expect(folded.length).toBe(1);
        // And two route_by_match controller groups should still be open.
        const openGroups = Array.from(
          canvasElement.querySelectorAll(".controller-group-node"),
        ).filter((el) => el.textContent?.includes("route_by_match"));
        expect(openGroups.length).toBe(2);
      },
      { timeout: 5000 },
    );
  },
};

// ─── Hidden when no controllers exist ───────────────────────────────────

export const FoldAllHiddenWhenNoControllers: Story = {
  args: {
    graphspec: {
      nodes: [
        {
          kind: "operator",
          status: "succeeded",
          id: "op1",
          pipe_code: "single",
          pipe_type: "PipeLLM",
          io: { inputs: [], outputs: [{ digest: "out", name: "result", concept: "Text" }] },
        },
      ],
      edges: [],
    },
    ...D,
  },
  play: async ({ canvasElement }) => {
    // Wait for the single node to render.
    await waitFor(
      () => {
        const nodes = canvasElement.querySelectorAll(".pipe-card");
        expect(nodes.length).toBeGreaterThan(0);
      },
      { timeout: 5000 },
    );

    // The fold-all / expand-all buttons should not be in the DOM.
    expect(canvasElement.querySelector('button[aria-label*="Fold all"]')).toBeNull();
    expect(canvasElement.querySelector('button[aria-label*="Expand all"]')).toBeNull();
  },
};
