import type {
  FoldToggleOptions,
  GraphSpecMode,
  NodePipeType,
  NodeValidationSummary,
  PipeCardPayload,
  PipeControllerType,
  PipeOperatorType,
  PipeStatus,
  PipeType,
} from "@graph/types";

export type {
  FoldToggleOptions,
  GraphSpecMode,
  NodePipeType,
  NodeValidationSummary,
  PipeControllerType,
  PipeOperatorType,
  PipeStatus,
  PipeType,
};

/**
 * What a pipe card draws: the payload the pure graph layer builds, under the name
 * the React layer has always exported. An alias rather than a copy, so a field is
 * declared once and the two can never drift apart.
 */
export type PipeCardData = PipeCardPayload;

export type PipeCardDirection = NonNullable<PipeCardData["direction"]>;
