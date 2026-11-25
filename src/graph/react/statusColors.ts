import type { PipeStatus } from "@graph/types";

/**
 * A pipe's run status as a colour, read from the palette the viewer sets inline on its
 * container, so a host's `paletteColors` re-themes the status dot on a card and in the detail
 * panel along with everything else. Each fallback is the colour the status was painted in
 * before it read the palette, for a card rendered outside a viewer.
 */
export const PIPE_STATUS_COLOR: Record<PipeStatus, string> = {
  succeeded: "var(--color-success, #50FA7B)",
  failed: "var(--color-error, #FF5555)",
  running: "var(--color-accent, #8BE9FD)",
  scheduled: "var(--text-dim, #6272a4)",
  skipped: "var(--text-dim, #6272a4)",
  canceled: "var(--text-dim, #6272a4)",
};
