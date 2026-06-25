import React from "react";
import type { Meta, StoryObj } from "@storybook/react-vite";
import { expect, waitFor, within, userEvent } from "storybook/test";
import type { GraphTheme } from "@graph/types";
import { GraphViewer } from "../GraphViewer";
import { LIVE_TWO_PIPE_CHAIN } from "./pipelines/specs/_generated/live/pipeline_02";

const meta: Meta<typeof GraphViewer> = {
  title: "Graph/ThemeToggle",
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

const SPEC = LIVE_TWO_PIPE_CHAIN;

// ─── Helpers ────────────────────────────────────────────────────────────

async function waitForRender(canvasElement: HTMLElement): Promise<HTMLElement> {
  await waitFor(
    () => {
      const nodes = canvasElement.querySelectorAll(".react-flow__node");
      expect(nodes.length).toBeGreaterThan(0);
    },
    { timeout: 5000 },
  );
  const container = canvasElement.querySelector(".react-flow-container") as HTMLElement | null;
  expect(container).not.toBeNull();
  return container!;
}

/** The resolved-theme palette is applied as inline CSS vars on the container. */
function pipeColor(container: HTMLElement): string {
  return container.style.getPropertyValue("--color-pipe").trim();
}

// ─── Cycle through all three modes via the toolbar button ───────────────

export const CycleThroughModes: Story = {
  args: { graphspec: SPEC, initialShowControllers: false },
  play: async ({ canvasElement }) => {
    const container = await waitForRender(canvasElement);
    const canvas = within(canvasElement);

    // Default mode is `system`.
    expect(container.classList.contains("react-flow-container--mode-system")).toBe(true);

    const toggle = canvas.getByLabelText(/^Theme:/);

    // system → light
    await userEvent.click(toggle);
    await waitFor(() =>
      expect(container.classList.contains("react-flow-container--mode-light")).toBe(true),
    );
    expect(container.classList.contains("react-flow-container--theme-light")).toBe(true);
    const lightColor = pipeColor(container);
    expect(lightColor).not.toBe("");

    // light → dark
    await userEvent.click(toggle);
    await waitFor(() =>
      expect(container.classList.contains("react-flow-container--mode-dark")).toBe(true),
    );
    expect(container.classList.contains("react-flow-container--theme-dark")).toBe(true);
    const darkColor = pipeColor(container);
    // The resolved palette — not just the background — switches with the theme.
    expect(darkColor).not.toBe(lightColor);

    // dark → system (full cycle)
    await userEvent.click(toggle);
    await waitFor(() =>
      expect(container.classList.contains("react-flow-container--mode-system")).toBe(true),
    );
  },
};

// ─── `system` follows an injected systemTheme and re-resolves on change ────

function InjectedSystemThemeHarness() {
  const [sys, setSys] = React.useState<GraphTheme>("light");
  return (
    <div style={{ width: "100%", height: "100vh", position: "relative" }}>
      <button
        type="button"
        data-testid="flip-system"
        onClick={() => setSys((s) => (s === "light" ? "dark" : "light"))}
        style={{ position: "absolute", top: 8, left: 8, zIndex: 100 }}
      >
        flip system theme
      </button>
      <GraphViewer
        graphspec={SPEC}
        theme="system"
        systemTheme={sys}
        initialShowControllers={false}
      />
    </div>
  );
}

export const SystemModeFollowsInjectedTheme: Story = {
  render: () => <InjectedSystemThemeHarness />,
  play: async ({ canvasElement }) => {
    const container = await waitForRender(canvasElement);
    const canvas = within(canvasElement);

    // mode=system + injected systemTheme=light → resolves to light.
    expect(container.classList.contains("react-flow-container--mode-system")).toBe(true);
    expect(container.classList.contains("react-flow-container--theme-light")).toBe(true);

    // Flipping the injected systemTheme re-resolves `system` with no toolbar click.
    await userEvent.click(canvas.getByTestId("flip-system"));
    await waitFor(() =>
      expect(container.classList.contains("react-flow-container--theme-dark")).toBe(true),
    );
    expect(container.classList.contains("react-flow-container--mode-system")).toBe(true);
  },
};
