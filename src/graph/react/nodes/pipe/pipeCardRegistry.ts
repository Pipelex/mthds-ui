import type { ComponentType } from "react";
import type { PipeCardBaseProps } from "./PipeCardBase";
import { PipeCardBase } from "./PipeCardBase";

/**
 * Registry mapping pipe operator type → card component.
 *
 * All types use PipeCardBase for now. To customize a specific type later,
 * create a wrapper component (e.g. PipeLLMCard) that composes PipeCardBase
 * with extra sections, then register it here.
 */
const PIPE_CARD_REGISTRY: Record<string, ComponentType<PipeCardBaseProps>> = {
  PipeLLM: PipeCardBase,
  PipeExtract: PipeCardBase,
  PipeCompose: PipeCardBase,
  PipeImgGen: PipeCardBase,
  PipeSearch: PipeCardBase,
  PipeFunc: PipeCardBase,
};

export function getPipeCardComponent(pipeType: string): ComponentType<PipeCardBaseProps> {
  return PIPE_CARD_REGISTRY[pipeType] ?? PipeCardBase;
}
