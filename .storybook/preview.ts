import type { Preview } from "@storybook/react-vite";
import "../src/graph/react/graph-core.css";
// Storybook is a host WITHOUT Tailwind (this repo runs none of its own, design
// Decision D), so it styles the form kernel's controls the way such a host does.
//
// The kernel's shadcn TOKENS — stock neutral values for `--background`,
// `--border`, `--primary`, … The package ships no `theme.css`, since those
// tokens belong to the host; Storybook is the host here, so it supplies them.
//
// The kernel's UTILITIES come through `src/styles/form-kernel.css`, the file a
// host without Tailwind imports as `@pipelex/mthds-ui/form-kernel.css`: the
// kernel's sheet under a cascade layer. No React entry imports it; the host
// does, and this is the host doing it. Never import
// `@pipelex/mthds-form/styles.css` directly here: that is the raw, unlayered
// sheet, which is not the lane a consumer takes.
import "@pipelex/mthds-form/theme.css";
import "../src/styles/form-kernel.css";

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
