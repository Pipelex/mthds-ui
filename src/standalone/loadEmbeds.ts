/**
 * What the standalone page embeds, turned into `GraphViewer` props. Pure and
 * DOM-free, so the whole load (parse, order, build, validate) is unit-tested
 * as the adapter runs it rather than through a replay that could drift.
 *
 * A page carries its graph one of two ways, never both:
 *
 * - `pipelex-graphspec`: a GraphSpec produced elsewhere, such as pipelex's own
 *   dry-run or live-run graph page.
 * - `mthds-sources`: the method's `.mthds` files, from which the static graph is
 *   built here, in the browser. Its id carries no `pipelex-` prefix because the
 *   files are the standard's own artifact, not a Pipelex one.
 */
import type { ValidationIssue } from "@graph/types";
import { VALIDATION_STATE } from "@graph/types";
import { validateGraphSpec } from "@graph/validateGraphSpec";
import { buildStaticGraphSpec } from "@static-graph/buildStaticGraphSpec";
import { mergeBundles } from "@static-graph/mergeBundles";
import { MTHDS_SOURCES_EMBED_ID, parseMthdsSourcesEmbed } from "@static-graph/mthdsSourcesEmbed";
import { parseMthdsBundle } from "@static-graph/parseMthdsBundle";
import { orderMthdsSources } from "@static-graph/sourceOrder";
import { staticDiagnosticsToValidationIssues } from "@static-graph/validationIssues";
import { isBlankScriptText, parseJsonScriptText } from "./readJsonScript";
import { buildViewerProps, type StandaloneViewerProps } from "./viewerProps";

/** The ids of the `<script type="application/json">` elements the adapter reads. */
export const EMBED_ID = {
  CONFIG: "pipelex-config",
  GRAPHSPEC: "pipelex-graphspec",
  MTHDS_SOURCES: MTHDS_SOURCES_EMBED_ID,
} as const;

/** The text content of each embed, as found in the page; absent ones are `null`. */
export interface EmbedTexts {
  config: string | null | undefined;
  graphspec: string | null | undefined;
  mthdsSources: string | null | undefined;
}

/**
 * Build the static graph for an embedded method. The files are put in merge
 * order first (the one declaring `main_pipe` leads, `bundle.mthds` when
 * several do), so no embedder has to know the rule. The builder's diagnostics
 * become the viewer's validation issues under the `unvalidated` state: nothing
 * validated this method, and a note the builder could not pin to a node
 * (unparseable TOML, a missing entry pipe) would otherwise be invisible.
 *
 * The stages run one by one rather than through `buildStaticGraphSpecFromToml`
 * so each file's own notes carry its name: a parse error's message gives a
 * line number, and with several files embedded that alone does not say where.
 */
function loadFromSources(rawConfig: unknown, rawSources: unknown): StandaloneViewerProps {
  const sources = orderMthdsSources(parseMthdsSourcesEmbed(rawSources));
  const parsed = sources.map((file) => parseMthdsBundle(file.content));
  const merged = mergeBundles(parsed.map((result) => result.bundle));
  const { spec, diagnostics } = buildStaticGraphSpec(merged);
  // Validated at the same boundary as an embedded spec: `GraphViewer` validates
  // during render, where a failure would blank the page instead of reaching the
  // error screen.
  const props = buildViewerProps(rawConfig, validateGraphSpec(spec));
  const issues: ValidationIssue[] = [
    ...sources.flatMap((file, index) =>
      staticDiagnosticsToValidationIssues(parsed[index].diagnostics).map((issue) => ({
        ...issue,
        file: file.name,
      })),
    ),
    ...staticDiagnosticsToValidationIssues([...merged.diagnostics, ...diagnostics]),
  ];
  if (issues.length === 0) return props;
  return { ...props, validationState: VALIDATION_STATE.UNVALIDATED, validationIssues: issues };
}

/**
 * Turn the page's embeds into viewer props. Throws on anything malformed (bad
 * JSON, a bad config token, a failed GraphSpec check, a malformed sources
 * embed, or both graph embeds at once), which the adapter shows on its error
 * screen. With neither graph embed, the viewer renders its empty state.
 */
export function loadStandaloneEmbeds(texts: EmbedTexts): StandaloneViewerProps {
  const rawConfig = parseJsonScriptText(texts.config, EMBED_ID.CONFIG);
  const rawGraphspec = parseJsonScriptText(texts.graphspec, EMBED_ID.GRAPHSPEC);
  const rawSources = parseJsonScriptText(texts.mthdsSources, EMBED_ID.MTHDS_SOURCES);
  // Presence is read off the text, not the parsed value: a sources element
  // holding JSON `null` is a malformed embed for the error screen, not an
  // absent one that would quietly render the empty viewer.
  const hasSources = !isBlankScriptText(texts.mthdsSources);
  if (rawGraphspec !== null && hasSources) {
    throw new Error(
      `The page embeds both <script id="${EMBED_ID.GRAPHSPEC}"> and ` +
        `<script id="${EMBED_ID.MTHDS_SOURCES}">; a page carries one graph, so embed one of them.`,
    );
  }
  if (hasSources) return loadFromSources(rawConfig, rawSources);
  // Validate an embedded spec at the boundary — fail loudly on malformed input
  // rather than rendering fabricated content downstream.
  const graphspec = rawGraphspec === null ? null : validateGraphSpec(rawGraphspec);
  return buildViewerProps(rawConfig, graphspec);
}
