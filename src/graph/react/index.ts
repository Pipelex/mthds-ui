"use client";

import "./graph-core.css";
import "./detail/DetailPanel.css";
import "./viewer/GraphToolbar.css";
// The form kernel's utilities, because this entry renders kernel components:
// the detail panel shows a stuff's data through `StuffResultPanel`, which is
// the kernel's `StuffViewer`. Its styling is therefore this entry's problem,
// not only `./form/react`'s - a host that only ever imports the graph (the
// normal case: `GraphViewer` is usually pulled in on its own, often through a
// dynamic import) would otherwise get the panel with a subset of its classes.
//
// A Tailwind host is supposed to generate these by scanning the kernel and does
// not: content globs stop at the host's own source and node_modules is off the
// sweep, so it gets exactly the classes it happens to use elsewhere. Nothing
// errors - the result grid just loses its column template and a structured
// result renders as a stack of labels each above its own value.
//
// The import goes through `../../styles/form-kernel.css` rather than straight
// at the kernel's sheet, because that sheet is a complete unscoped Tailwind
// build and needs a cascade layer around it before it is safe to inject into a
// host that has Tailwind of its own. That file explains what it broke.
// Importing the same specifier from both entries is deliberate and free: a
// bundler emits one copy.
import "../../styles/form-kernel.css";

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
