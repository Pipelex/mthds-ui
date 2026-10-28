/**
 * The pipe registries of the methods the recorded runs ran, built from their
 * `.mthds` bundles by the static builder, never written by hand: the map a host
 * passes the timeline as `pipeRegistry`, keyed by `pipe_ref`.
 */
import type { PipeBlueprintUnion } from "@graph/types";
import { buildStaticGraphSpecFromToml } from "@static-graph/buildStaticGraphSpec";
import reviewFilingsBundle from "./methods/review_filings.mthds?raw";
import vetCompanyBundle from "./methods/vet_company.mthds?raw";

export type PipeRegistry = Readonly<Record<string, PipeBlueprintUnion>>;

function registryOf(bundle: string): PipeRegistry {
  return buildStaticGraphSpecFromToml(bundle).spec.pipe_registry ?? {};
}

/** `filings.review_filings`, the method of `REVIEW_FILINGS_RUN`, `WIDE_BATCH_RUN` and the worked example. */
export const REVIEW_FILINGS_REGISTRY: PipeRegistry = registryOf(reviewFilingsBundle);

/** `diligence.vet_company`, the method of `VET_COMPANY_RUN`. */
export const VET_COMPANY_REGISTRY: PipeRegistry = registryOf(vetCompanyBundle);
