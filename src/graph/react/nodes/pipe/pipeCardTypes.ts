import type { PipeOperatorType, PipeStatus, PipeType } from "@graph/types";

export type { PipeOperatorType, PipeStatus, PipeType };

export type PipeCardDirection = "LR" | "TB";

export interface PipeCardData {
  pipeCode: string;
  pipeType: PipeType;
  description?: string;
  status: PipeStatus;
  inputs: { name: string; concept: string }[];
  outputs: { name: string; concept: string }[];
  /** Blueprint-specific tags (model, prompt, etc.) */
  tags?: Record<string, string>;
  /** Layout direction — controls card orientation (narrow+tall in LR, wide+short in TB) */
  direction?: PipeCardDirection;
  /** When set, the card renders an unfold button that invokes this callback. */
  onExpand?: () => void;
}
