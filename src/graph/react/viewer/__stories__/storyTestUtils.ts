import { waitFor } from "storybook/test";

/**
 * Wait for the ELK layout to finish and at least one ReactFlow node to mount.
 * Shared by the `GraphViewer` stories so the render-readiness signal (the
 * `.react-flow__node` selector) and the timeout live in one place instead of
 * being re-implemented per story file. `waitFor` retries the callback until it
 * stops throwing, so we throw (rather than assert) to keep this helper under
 * the repo's strict promise linting outside the stories-only rule relaxation.
 */
export async function waitForGraphRender(canvasElement: HTMLElement): Promise<void> {
  await waitFor(
    () => {
      const nodes = canvasElement.querySelectorAll(".react-flow__node");
      if (nodes.length === 0) throw new Error("waitForGraphRender: no ReactFlow nodes mounted yet");
    },
    { timeout: 5000 },
  );
}
