"use client";

import "./graph-core.css";
import "./detail/DetailPanel.css";
import "./viewer/GraphToolbar.css";
// No form kernel stylesheet is imported here, on purpose. The detail panel
// renders kernel controls (`StuffResultPanel` is the kernel's result view), and
// the host styles those in the way its kind of host needs: a host with
// Tailwind 4 compiles the kernel's classes itself, with
// `@import "@pipelex/mthds-ui/tailwind.css"` in place of the `@source` line of
// the kernel's documented setup, and a host without Tailwind imports
// `@pipelex/mthds-ui/form-kernel.css` once. The README's "Styling the form
// controls" section is the host's side of it.
//
// Do not put an import back. v0.20.0 made the kernel's sheet this entry's job
// because Tailwind 3 hosts kept forgetting a content glob into node_modules and
// silently lost the classes only the kernel uses; v0.21.0 wrapped the sheet in
// a cascade layer after the raw copy beat the host's own responsive variants.
// Neither arrangement works. The sheet is a complete Tailwind build, and in a
// Tailwind 4 host its preflight belongs below the host's base while its
// utilities belong above the host's base and below the host's utilities, which
// one `@import … layer()` cannot express: appended, the layer outranked every
// variant the host wrote; named first, the host's preflight stripped the
// kernel's utilities. In a host without Tailwind, the preflight reset every
// browser default on the page the moment a graph mounted.
// `docs/run-form-panel.md` has the full account.

// Viewer
export { GraphViewer, applyStatusOverrides } from "./viewer/GraphViewer";
export type { GraphViewerProps } from "./viewer/GraphViewer";
export { renderLabel, hydrateLabels } from "./viewer/renderLabel";
// Validation widget — the panel + its pure helpers (the widget itself is part
// of GraphToolbar and enabled via GraphViewer's `validationState` prop).
export {
  ValidationPanel,
  validationLabel,
  validationPanelPlacement,
} from "./viewer/ValidationPanel";
export type { ValidationPanelPlacement, ValidationPanelProps } from "./viewer/ValidationPanel";
// System-theme detection — for hosts that drive `system` from their own
// environment signal (e.g. a VS Code webview) or need the browser default.
export { useSystemTheme, detectSystemTheme } from "./viewer/useSystemTheme";

// ReactFlow type bridge
export type { AppNode, AppEdge, AppRFInstance } from "./rfTypes";
export { toAppNodes, toAppEdges } from "./rfTypes";

// Node types
export { ControllerGroupNode, controllerNodeTypes } from "./nodes/controller/ControllerGroupNode";
export { PipeCardNode } from "./nodes/pipe/PipeCardNode";
export { PipeCardBase } from "./nodes/pipe/PipeCardBase";
export type { PipeCardBaseProps } from "./nodes/pipe/PipeCardBase";
export type { PipeCardData, PipeOperatorType, PipeStatus } from "./nodes/pipe/pipeCardTypes";

// The graph's data panel, rendered from the standard's own artifacts. Exported
// for a host that wants the same view outside the graph.
export { StuffResultPanel } from "./detail/StuffResultPanel";
export type { StuffResultPanelProps, StuffResultRendererOptions } from "./detail/StuffResultPanel";

// Detail panel
export * from "./detail";
