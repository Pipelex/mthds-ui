/**
 * PLACEHOLDER — wraps the DRY spec as LIVE so Storybook builds
 * without a paid live run. Run `make fixtures-live` for real LIVE data.
 */
import type { GraphSpec } from "@graph/types";
import { DRY_AVAILABILITY_ROUTING } from "../dry/pipeline_33";

export const LIVE_AVAILABILITY_ROUTING = {
  ...DRY_AVAILABILITY_ROUTING,
  meta: { ...DRY_AVAILABILITY_ROUTING.meta, format: "mthds", mode: "live" },
} as GraphSpec;
