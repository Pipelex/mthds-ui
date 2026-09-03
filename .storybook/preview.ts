import type { Preview } from "@storybook/react-vite";
import "../src/graph/react/graph-core.css";
// The form kernel's shadcn TOKENS — stock neutral values for `--background`,
// `--border`, `--primary`, … This repo runs no Tailwind of its own (design
// Decision D) and the entries deliberately ship no `theme.css`, since those
// tokens belong to the host; Storybook is the host here, so it supplies them.
//
// The kernel's UTILITIES come through the same wrapper a consumer gets,
// `src/styles/form-kernel.css`, which pulls the kernel's sheet into a cascade
// layer. Imported explicitly rather than inherited from a React entry because
// the stories import components by their deep paths (`@form/react/RunPanel`,
// `@graph/react/viewer/GraphViewer`), never through `index.ts`, so the entries'
// own side-effect imports never run here. Never import
// `@pipelex/mthds-form/styles.css` directly: that is the raw, unlayered sheet
// these stories exist to stop us from shipping again.
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
