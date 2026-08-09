/**
 * PLACEHOLDER — wraps the DRY spec as LIVE so Storybook builds
 * without a paid live run. Run `make fixtures-live` for real LIVE data.
 */
import type { GraphSpec } from "@graph/types";
import { DRY_MEETING_TRIAGE } from "../dry/pipeline_32";

export const LIVE_MEETING_TRIAGE = {
  ...DRY_MEETING_TRIAGE,
  meta: { ...DRY_MEETING_TRIAGE.meta, format: "mthds", mode: "live" },
} as GraphSpec;
