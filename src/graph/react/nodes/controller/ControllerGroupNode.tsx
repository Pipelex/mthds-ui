import React from "react";
import { MAX_VISIBLE_CONTROLLER_CHILDREN } from "../../../graphControllers";

export type ControllerType = "PipeSequence" | "PipeParallel" | "PipeCondition" | "PipeBatch";

interface ControllerGroupData {
  label?: React.ReactNode;
  pipeType?: string;
  childCount?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

const CONTROLLER_CONFIG: Record<string, { badge: string; icon: string }> = {
  PipeSequence: { badge: "Sequence", icon: "→" },
  PipeParallel: { badge: "Parallel", icon: "//" },
  PipeCondition: { badge: "Condition", icon: "◇" },
  PipeBatch: { badge: "Batch", icon: "≡" },
};

function getControllerConfig(pipeType: string | undefined) {
  if (!pipeType) return { badge: "", icon: "" };
  return CONTROLLER_CONFIG[pipeType] ?? { badge: pipeType.replace("Pipe", ""), icon: "⊞" };
}

function getControllerModifier(pipeType: string | undefined): string {
  if (!pipeType) return "";
  const key = pipeType.replace("Pipe", "").toLowerCase();
  return `controller-group--${key}`;
}

export function ControllerGroupNode({ data }: { data: ControllerGroupData }) {
  const config = getControllerConfig(data.pipeType);
  const modifier = getControllerModifier(data.pipeType);

  const isCollapsible =
    (data.pipeType === "PipeParallel" || data.pipeType === "PipeBatch") &&
    (data.childCount ?? 0) > MAX_VISIBLE_CONTROLLER_CHILDREN;

  const hiddenCount = isCollapsible
    ? (data.childCount ?? 0) - MAX_VISIBLE_CONTROLLER_CHILDREN
    : 0;

  return (
    <div className={`controller-group-node ${modifier}`}>
      <div className="controller-group-header">
        <span className="controller-group-icon">{config.icon}</span>
        <span className="controller-group-badge">{config.badge}</span>
        {data.label && <span className="controller-group-label">{data.label}</span>}
      </div>
      {isCollapsible && (
        <button
          className="controller-group-collapse"
          onClick={(e) => {
            e.stopPropagation();
            data.onToggleCollapse?.();
          }}
        >
          {data.isCollapsed ? `+${hiddenCount} hidden` : "collapse"}
        </button>
      )}
    </div>
  );
}

// Stable reference to avoid ReactFlow re-mount warnings
export const controllerNodeTypes = { controllerGroup: ControllerGroupNode };
