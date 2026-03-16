import React from "react";

interface ControllerGroupData {
  label?: React.ReactNode;
  pipeType?: string;
}

export function ControllerGroupNode({ data }: { data: ControllerGroupData }) {
  return (
    <div className="controller-group-node">
      {data.label ? <div className="controller-group-label">{data.label}</div> : null}
      {data.pipeType ? <div className="controller-group-type">{data.pipeType}</div> : null}
    </div>
  );
}

// Stable reference to avoid ReactFlow re-mount warnings
export const controllerNodeTypes = { controllerGroup: ControllerGroupNode };
