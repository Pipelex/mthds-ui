import type { GraphConfig } from "./types";

export const DEFAULT_GRAPH_CONFIG: GraphConfig = {
  direction: "LR",
  showControllers: false,
  nodesep: 50,
  ranksep: 100,
  edgeType: "bezier",
  initialZoom: null,
  panToTop: true,
  paletteColors: {
    // Graph node/edge colors
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
    // Base theme vars used by graph-core.css
    "--color-bg": "#0a0a0a",
    "--color-bg-dots": "rgba(255, 255, 255, 0.35)",
    "--color-text-muted": "#94a3b8",
    "--color-controller-text": "#94a3b8",
    "--font-sans": '"Inter", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
    "--font-mono": '"JetBrains Mono", "Monaco", "Menlo", monospace',
    "--shadow-lg": "0 8px 24px rgba(0, 0, 0, 0.5)",
  },
};

export function getPaletteColors(): Record<string, string> {
  return DEFAULT_GRAPH_CONFIG.paletteColors || {};
}
