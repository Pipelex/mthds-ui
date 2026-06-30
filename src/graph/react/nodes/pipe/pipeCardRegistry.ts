import type { ComponentType } from "react";
import type { PipeType } from "./pipeCardTypes";
import type { PipeCardBaseProps } from "./PipeCardBase";
import { PipeCardBase } from "./PipeCardBase";

/**
 * Registry mapping pipe type → card component.
 *
 * All types use PipeCardBase for now. To customize a specific type later,
 * create a wrapper component (e.g. PipeLLMCard) that composes PipeCardBase
 * with extra sections, then register it here.
 */
const PIPE_CARD_REGISTRY: Record<PipeType, ComponentType<PipeCardBaseProps>> = {
  PipeLLM: PipeCardBase,
  PipeExtract: PipeCardBase,
  PipeCompose: PipeCardBase,
  PipeImgGen: PipeCardBase,
  PipeSearch: PipeCardBase,
  PipeFunc: PipeCardBase,
  PipeStructure: PipeCardBase,
  PipeSignature: PipeCardBase,
  PipeSequence: PipeCardBase,
  PipeParallel: PipeCardBase,
  PipeCondition: PipeCardBase,
  PipeBatch: PipeCardBase,
};

export function getPipeCardComponent(pipeType: PipeType): ComponentType<PipeCardBaseProps> {
  return PIPE_CARD_REGISTRY[pipeType];
}
