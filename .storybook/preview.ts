import type { Preview } from "@storybook/react-vite";
import "../src/graph/react/graph-core.css";
// The form kernel's PREBUILT styling lane — `theme.css` (stock shadcn neutral
// tokens) plus `styles.css` (the compiled Tailwind utilities, preflight
// included). This is the lane a host without its own Tailwind build takes, and
// Storybook is where we exercise it: the run panel's controls are the kernel's,
// and this repo deliberately runs no Tailwind of its own (design Decision D).
import "@pipelex/mthds-form/theme.css";
import "@pipelex/mthds-form/styles.css";

const preview: Preview = {
  parameters: {
    backgrounds: {
      default: "dark",
      values: [
        { name: "dark", value: "#0a0a0a" },
        { name: "light", value: "#ffffff" },
      ],
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
    },
    a11y: {
      test: "todo",
    },
  },
};

export default preview;
