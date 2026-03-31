import React from "react";
import { Handle, Position } from "@xyflow/react";
import type { PipeCardData } from "./pipeCardTypes";
import { getPipeCardComponent } from "./pipeCardRegistry";
import { PipeCardBase } from "./PipeCardBase";

export interface PipeCardNodeProps {
  data: PipeCardData;
}

/** Resolves the correct card component for the pipe type and renders it. */
export function PipeCardNode({ data }: PipeCardNodeProps) {
  const Card = getPipeCardComponent(data.pipeType) ?? PipeCardBase;
  return <Card data={data} />;
}

/**
 * ReactFlow custom node wrapper.
 *
 * Renders source/target handles using the positions set by the layout engine
 * (TB → top/bottom, LR → left/right, etc.).
 */
export function PipeCardRFNode({
  data,
  sourcePosition = Position.Bottom,
  targetPosition = Position.Top,
}: {
  data: Record<string, unknown>;
  sourcePosition?: Position;
  targetPosition?: Position;
}) {
  const payload = data.pipeCardData as PipeCardData | undefined;
  if (!payload) return null;
  return (
    <>
      <Handle type="target" position={targetPosition} />
      <PipeCardNode data={payload} />
      <Handle type="source" position={sourcePosition} />
    </>
  );
}
