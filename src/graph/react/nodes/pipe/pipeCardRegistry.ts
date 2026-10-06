import type { ComponentType } from "react";
import type { NodePipeType } from "./pipeCardTypes";
import type { PipeCardBaseProps } from "./PipeCardBase";
import { PipeCardBase } from "./PipeCardBase";

/**
 * Registry mapping pipe type → card component, the binding step included.
 *
 * All types use PipeCardBase for now. To customize a specific type later,
 * create a wrapper component (e.g. PipeLLMCard) that composes PipeCardBase
 * with extra sections, then register it here.
 */
const PIPE_CARD_REGISTRY: Record<NodePipeType, ComponentType<PipeCardBaseProps>> = {
  PipeLLM: PipeCardBase,
  PipeExtract: PipeCardBase,
  PipeCompose: PipeCardBase,
  PipeImgGen: PipeCardBase,
  PipeSearch: PipeCardBase,
  PipeFunc: PipeCardBase,
  PipeStructure: PipeCardBase,
  PipeJudge: PipeCardBase,
  PipeDocGen: PipeCardBase,
  PipeSignature: PipeCardBase,
  PipeSequence: PipeCardBase,
  PipeParallel: PipeCardBase,
  PipeCondition: PipeCardBase,
  PipeBatch: PipeCardBase,
  BindingStep: PipeCardBase,
};

export function getPipeCardComponent(pipeType: NodePipeType): ComponentType<PipeCardBaseProps> {
  return PIPE_CARD_REGISTRY[pipeType];
}
