import React from "react";
import type { Decorator } from "@storybook/react-vite";
import { DARK_PALETTE_COLORS } from "@graph/graphConfig";

/** Dark surface for every ControllerGroupNode story.
 *
 *  Applies the dark theme palette as CSS variables. In the app the GraphViewer
 *  container provides these tokens; a node rendered on its own must be given
 *  them too, or every `var(--ctrl-*)` resolves to nothing and the node renders
 *  black on black. */
export const controllerStoryDecorator: Decorator = (Story) => (
  <div
    style={{
      padding: 40,
      background: "#0a0a0a",
      minHeight: "100vh",
      ...(DARK_PALETTE_COLORS as React.CSSProperties),
    }}
  >
    <Story />
  </div>
);
