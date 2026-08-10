/**
 * Static fixture specs built in-repo from raw `.mthds` bundles.
 *
 * Unlike the DRY/LIVE barrels, this file does not call the pipelex CLI. It
 * imports TOML fixture text and runs the pure TypeScript static graph builder.
 */
import type { GraphSpec } from "@graph/types";
import { buildStaticGraphSpecFromToml } from "@static-graph/buildStaticGraphSpec";

import bundle01 from "../../../../../../../data/pipelines/pipeline_01/bundle.mthds?raw";
import bundle02 from "../../../../../../../data/pipelines/pipeline_02/bundle.mthds?raw";
import bundle03 from "../../../../../../../data/pipelines/pipeline_03/bundle.mthds?raw";
import bundle04 from "../../../../../../../data/pipelines/pipeline_04/bundle.mthds?raw";
import bundle05 from "../../../../../../../data/pipelines/pipeline_05/bundle.mthds?raw";
import bundle06 from "../../../../../../../data/pipelines/pipeline_06/bundle.mthds?raw";
import bundle07 from "../../../../../../../data/pipelines/pipeline_07/bundle.mthds?raw";
import bundle08 from "../../../../../../../data/pipelines/pipeline_08/bundle.mthds?raw";
import bundle09 from "../../../../../../../data/pipelines/pipeline_09/bundle.mthds?raw";
import bundle10 from "../../../../../../../data/pipelines/pipeline_10/bundle.mthds?raw";
import bundle11 from "../../../../../../../data/pipelines/pipeline_11/bundle.mthds?raw";
import bundle12 from "../../../../../../../data/pipelines/pipeline_12/bundle.mthds?raw";
import bundle13 from "../../../../../../../data/pipelines/pipeline_13/bundle.mthds?raw";
import bundle14 from "../../../../../../../data/pipelines/pipeline_14/bundle.mthds?raw";
import bundle15 from "../../../../../../../data/pipelines/pipeline_15/bundle.mthds?raw";
import bundle16 from "../../../../../../../data/pipelines/pipeline_16/bundle.mthds?raw";
import bundle17 from "../../../../../../../data/pipelines/pipeline_17/bundle.mthds?raw";
import bundle18 from "../../../../../../../data/pipelines/pipeline_18/bundle.mthds?raw";
import bundle19 from "../../../../../../../data/pipelines/pipeline_19/bundle.mthds?raw";
import bundle20 from "../../../../../../../data/pipelines/pipeline_20/bundle.mthds?raw";
import bundle21 from "../../../../../../../data/pipelines/pipeline_21/bundle.mthds?raw";
import bundle22 from "../../../../../../../data/pipelines/pipeline_22/bundle.mthds?raw";
import bundle23 from "../../../../../../../data/pipelines/pipeline_23/bundle.mthds?raw";
import bundle24 from "../../../../../../../data/pipelines/pipeline_24/bundle.mthds?raw";
import bundle25 from "../../../../../../../data/pipelines/pipeline_25/bundle.mthds?raw";
import bundle26 from "../../../../../../../data/pipelines/pipeline_26/bundle.mthds?raw";
import bundle28 from "../../../../../../../data/pipelines/pipeline_28/bundle.mthds?raw";
import bundle30 from "../../../../../../../data/pipelines/pipeline_30/bundle.mthds?raw";
import bundle31 from "../../../../../../../data/pipelines/pipeline_31/bundle.mthds?raw";
import bundle32 from "../../../../../../../data/pipelines/pipeline_32/bundle.mthds?raw";
import bundle33 from "../../../../../../../data/pipelines/pipeline_33/bundle.mthds?raw";
import bundle34 from "../../../../../../../data/pipelines/pipeline_34/bundle.mthds?raw";

function staticSpec(toml: string): GraphSpec {
  return buildStaticGraphSpecFromToml(toml).spec;
}

export const STATIC_SINGLE_PIPE = staticSpec(bundle01);
export const STATIC_TWO_PIPE_CHAIN = staticSpec(bundle02);
export const STATIC_SIMPLE_SEQUENCE = staticSpec(bundle03);
export const STATIC_LONG_SEQUENCE = staticSpec(bundle04);
export const STATIC_SIMPLE_PARALLEL = staticSpec(bundle05);
export const STATIC_THREE_WAY_PARALLEL = staticSpec(bundle06);
export const STATIC_SIMPLE_CONDITION = staticSpec(bundle07);
export const STATIC_SIMPLE_BATCH = staticSpec(bundle08);
export const STATIC_CV_SCREENING = staticSpec(bundle09);
export const STATIC_NESTED_SEQ_PAR_SEQ = staticSpec(bundle10);
export const STATIC_NESTED_SEQ_COND_SEQ = staticSpec(bundle11);
export const STATIC_BATCH_WITH_INNER_SEQ = staticSpec(bundle12);
export const STATIC_DIAMOND_PATTERN = staticSpec(bundle13);
export const STATIC_ALL_PIPE_TYPES = staticSpec(bundle14);
export const STATIC_RAG_PIPELINE = staticSpec(bundle15);
export const STATIC_IMAGE_PIPELINE = staticSpec(bundle16);
export const STATIC_EMAIL_TRIAGE = staticSpec(bundle17);
export const STATIC_CODE_REVIEW = staticSpec(bundle18);
export const STATIC_CONTENT_MODERATION = staticSpec(bundle19);
export const STATIC_WIDE_PARALLEL = staticSpec(bundle20);
export const STATIC_MULTI_INPUT_CONVERGE = staticSpec(bundle21);
export const STATIC_MULTI_OUTPUT_FANOUT = staticSpec(bundle22);
export const STATIC_SIBLING_PARALLELS = staticSpec(bundle23);
export const STATIC_DEEP_NESTING = staticSpec(bundle24);
export const STATIC_ALL_CONTROLLER_TYPES = staticSpec(bundle25);
export const STATIC_CV_MATCHING = staticSpec(bundle26);
export const STATIC_CV_BATCH_SCREENING = staticSpec(bundle28);
export const STATIC_CV_ANALYZER = staticSpec(bundle30);
export const STATIC_RFP_QUALIFIER = staticSpec(bundle31);
export const STATIC_MEETING_TRIAGE = staticSpec(bundle32);
export const STATIC_AVAILABILITY_ROUTING = staticSpec(bundle33);
export const STATIC_ALL_NATIVE_CONCEPTS = staticSpec(bundle34);
