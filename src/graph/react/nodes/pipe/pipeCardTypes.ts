import type { PipeOperatorType, PipeStatus } from "@graph/types";

export type { PipeOperatorType, PipeStatus };

export type PipeCardDirection = "LR" | "TB";

export interface PipeCardData {
  pipeCode: string;
  pipeType: PipeOperatorType;
  description?: string;
  status: PipeStatus;
  inputs: { name: string; concept: string }[];
  outputs: { name: string; concept: string }[];
  /** Blueprint-specific tags (model, prompt, etc.) */
  tags?: Record<string, string>;
  /** Layout direction — controls card orientation (narrow+tall in LR, wide+short in TB) */
  direction?: PipeCardDirection;
}
