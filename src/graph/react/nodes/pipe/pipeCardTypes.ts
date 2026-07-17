import type {
  FoldToggleOptions,
  GraphSpecMode,
  NodeValidationSummary,
  PipeControllerType,
  PipeOperatorType,
  PipeStatus,
  PipeType,
} from "@graph/types";

export type {
  FoldToggleOptions,
  GraphSpecMode,
  NodeValidationSummary,
  PipeControllerType,
  PipeOperatorType,
  PipeStatus,
  PipeType,
};

export type PipeCardDirection = "LR" | "TB";

export interface PipeCardData {
  pipeCode: string;
  pipeType: PipeType;
  description?: string;
  status: PipeStatus;
  graphMode?: GraphSpecMode;
  inputs: { name: string; concept: string }[];
  outputs: { name: string; concept: string }[];
  /** Blueprint-specific tags (model, prompt, etc.) */
  tags?: Record<string, string>;
  /** Layout direction — controls card orientation (narrow+tall in LR, wide+short in TB) */
  direction?: PipeCardDirection;
  /** When set, the card renders an unfold button that invokes this callback. */
  onExpand?: (options?: FoldToggleOptions) => void;
  /** Validation decoration (severity ring + count badge), stamped by GraphViewer. */
  validation?: NodeValidationSummary;
  /** Badge click handler (opens the validation panel), stamped alongside `validation`. */
  onValidationBadgeClick?: () => void;
}
