"use client";

import "./graph-core.css";
import "./detail/DetailPanel.css";
import "./stuff/StuffViewer.css";
import "./viewer/GraphToolbar.css";

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

// Stuff viewer
export * from "./stuff";

// Detail panel
export * from "./detail";
