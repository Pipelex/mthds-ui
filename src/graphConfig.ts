import type { GraphConfig } from "./types";

export const DEFAULT_GRAPH_CONFIG: GraphConfig = {
  direction: "TB",
  showControllers: false,
  nodesep: 50,
  ranksep: 30,
  edgeType: "bezier",
  initialZoom: null,
  panToTop: true,
  paletteColors: {
    "--color-pipe": "#ff6b6b",
    "--color-pipe-bg": "rgba(224,108,117,0.18)",
    "--color-pipe-text": "#ffffff",
    "--color-stuff": "#4ECDC4",
    "--color-stuff-bg": "rgba(78,205,196,0.12)",
    "--color-stuff-border": "#9ddcfd",
    "--color-stuff-text": "#98FB98",
    "--color-stuff-text-dim": "#9ddcfd",
    "--color-edge": "#FFFACD",
    "--color-batch-item": "#bd93f9",
    "--color-batch-aggregate": "#50fa7b",
    "--color-parallel-combine": "#d6a4ff",
    "--color-success": "#50FA7B",
    "--color-success-bg": "rgba(80,250,123,0.15)",
    "--color-error": "#FF5555",
    "--color-error-bg": "rgba(255,85,85,0.15)",
    "--color-accent": "#8BE9FD",
    "--color-warning": "#FFB86C",
  },
};

export function getPaletteColors(): Record<string, string> {
  return DEFAULT_GRAPH_CONFIG.paletteColors || {};
}
