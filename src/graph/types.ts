// ─── Pipe type taxonomy ─────────────────────────────────────────────────────
// Operators perform work; controllers orchestrate other pipes.

export type PipeOperatorType =
  | "PipeLLM"
  | "PipeExtract"
  | "PipeCompose"
  | "PipeImgGen"
  | "PipeSearch"
  | "PipeFunc"
  | "PipeStructure" // turns Text into a structured concept via an LLM
  | "PipeSignature"; // contract-only stub — emitted under `--allow-signatures`

export type PipeControllerType = "PipeSequence" | "PipeParallel" | "PipeCondition" | "PipeBatch";

export type PipeType = PipeOperatorType | PipeControllerType;

// Presence map over the full `PipeType` union — typed as `Record<PipeType, true>`
// so adding a pipe class to the union without listing it here is a compile
// error. `KNOWN_PIPE_TYPES` derives its keys from this map, keeping the runtime
// check the validator performs in sync with the type.
const PIPE_TYPE_PRESENCE: Record<PipeType, true> = {
  PipeLLM: true,
  PipeExtract: true,
  PipeCompose: true,
  PipeImgGen: true,
  PipeSearch: true,
  PipeFunc: true,
  PipeStructure: true,
  PipeSignature: true,
  PipeSequence: true,
  PipeParallel: true,
  PipeCondition: true,
  PipeBatch: true,
};

/** Every pipe class name pipelex emits as `pipe_type`. Used by validateGraphSpec. */
export const KNOWN_PIPE_TYPES: ReadonlySet<string> = new Set(Object.keys(PIPE_TYPE_PRESENCE));

export type PipeStatus = "succeeded" | "failed" | "running" | "scheduled" | "skipped" | "canceled";

// ─── GraphSpec mode contract ────────────────────────────────────────────────

export const GRAPH_SPEC_MODE = {
  DRY: "dry",
  LIVE: "live",
  STATIC: "static",
} as const;

export type GraphSpecMode = (typeof GRAPH_SPEC_MODE)[keyof typeof GRAPH_SPEC_MODE];

export interface GraphSpecMeta {
  format: "mthds";
  /**
   * Missing mode is a legacy runtime graph. Static UI behavior must key only on
   * `mode === "static"` and never infer it from absent runtime fields.
   */
  mode?: GraphSpecMode;
  [key: string]: unknown;
}

// ─── Node type constants ────────────────────────────────────────────────────
// Used by graphBuilders and consumed by ReactFlow custom node registration.

export const NODE_TYPE_PIPE_CARD = "pipeCard" as const;
export const NODE_TYPE_STUFF = "default" as const;
export const NODE_TYPE_CONTROLLER = "controllerGroup" as const;

// ─── Stuff node ID helpers ──────────────────────────────────────────────────
// Stuff (data) nodes use a "stuff_<digest>" convention throughout the graph.

export const STUFF_ID_PREFIX = "stuff_";

export function stuffNodeId(digest: string): string {
  return STUFF_ID_PREFIX + digest;
}

export function isStuffNodeId(id: string): boolean {
  return id.startsWith(STUFF_ID_PREFIX);
}

export function stuffDigestFromId(id: string): string {
  return id.slice(STUFF_ID_PREFIX.length);
}

// ─── GraphSpec types (from pipelex-agent --view output) ─────────────────────

export interface GraphSpecNodeIoItem {
  name: string;
  digest?: string;
  concept?: string;
  content_type?: string;
  preview?: string;
  size?: number;
  data?: unknown;
  data_text?: string;
  data_html?: string;
  extra?: Record<string, unknown>;
}

export interface GraphSpecNodeIo {
  inputs: GraphSpecNodeIoItem[];
  outputs: GraphSpecNodeIoItem[];
}

export type NodeKind =
  | "pipe_call"
  | "controller"
  | "operator"
  | "input"
  | "output"
  | "artifact"
  | "error";

export interface GraphSpecNodeTiming {
  started_at: string;
  ended_at: string;
  duration: number;
}

export interface GraphSpecNodeError {
  error_type: string;
  message: string;
  stack?: string;
}

export interface GraphSpecNode {
  id: string;
  kind: NodeKind;
  pipe_code?: string;
  pipe_type: PipeType;
  description?: string;
  domain_code?: string;
  status: PipeStatus;
  timing?: GraphSpecNodeTiming;
  io: GraphSpecNodeIo;
  error?: GraphSpecNodeError;
  tags?: Record<string, string>;
  metrics?: Record<string, number>;
  execution_data?: Record<string, unknown>;
}

/**
 * A pipe-call node — the only node kind a real pipelex run emits. Narrowed
 * from `GraphSpecNode` for code paths that only ever render pipe-call nodes,
 * where `pipe_code` is guaranteed (validateGraphSpec enforces this).
 */
export type PipeCallNode = GraphSpecNode & {
  kind: "controller" | "operator";
  pipe_code: string;
  pipe_type: PipeType;
};

export type GraphSpecEdgeKind =
  | "contains"
  | "data"
  | "control"
  | "selected_outcome"
  | "batch_item"
  | "batch_aggregate"
  | "parallel_combine";

export interface GraphSpecEdge {
  id: string;
  source: string;
  target: string;
  kind: GraphSpecEdgeKind;
  label?: string;
  source_stuff_digest?: string;
  target_stuff_digest?: string;
  meta?: Record<string, unknown>;
}

// ─── Concept and Pipe registry types ───────────────────────────────────────
// Serialized from Python Concept and PipeAbstract instances via model_dump().

export interface ConceptInfo {
  code: string;
  domain_code: string;
  description: string;
  structure_class_name: string;
  refines: string | null;
  json_schema?: Record<string, unknown>;
}

export interface StuffSpecInfo {
  concept: ConceptInfo;
  multiplicity: number | boolean | null;
}

// ─── Template blueprint (shared by LLM prompts, Search, Compose, ImgGen) ───

export interface TemplateBlueprint {
  template: string;
  templating_style: string | null;
  category: string;
  extra_context: Record<string, unknown> | null;
}

// ─── Sub-pipe (used by Sequence, Parallel, Batch) ──────────────────────

export interface SubPipeSpec {
  pipe_code: string;
  output_name: string | null;
  output_multiplicity: string | number | boolean | null;
  batch_params: { input_list_stuff_name: string; input_item_stuff_name: string } | null;
}

// ─── PipeAbstract base (common to all pipe types) ──────────────────────

export interface PipeBlueprintBase {
  type: PipeType;
  pipe_category: "PipeOperator" | "PipeController";
  code: string;
  domain_code: string;
  description: string;
  inputs: Record<string, StuffSpecInfo>;
  output: StuffSpecInfo;
}

// ─── Operator blueprints ───────────────────────────────────────────────

export interface PipeLLMBlueprint extends PipeBlueprintBase {
  type: "PipeLLM";
  llm_prompt_spec: {
    templating_style: string | null;
    system_prompt_blueprint: TemplateBlueprint | null;
    prompt_blueprint: TemplateBlueprint | null;
    user_image_references: unknown[] | null;
    user_document_references: unknown[] | null;
    system_image_references: unknown[] | null;
    system_document_references: unknown[] | null;
  };
  llm_choices: { for_text: string | null; for_object: string | null } | null;
  structuring_method: string | null;
  output_multiplicity: string | number | null;
}

export interface PipeImgGenBlueprint extends PipeBlueprintBase {
  type: "PipeImgGen";
  img_gen_prompt_blueprint: {
    prompt_blueprint: TemplateBlueprint | null;
    negative_prompt_blueprint: TemplateBlueprint | null;
    image_references: unknown[] | null;
  };
  img_gen_choice: string | null;
  aspect_ratio: string | null;
  is_raw: boolean | null;
  seed: number | string | null;
  background: string | null;
  output_format: string | null;
  output_multiplicity: number;
}

/**
 * A single field in a PipeCompose construct blueprint. Mirrors the
 * `ConstructFieldBlueprint` Pydantic model in pipelex. Exactly one of
 * `fixed_value` / `from_path` / `template` / `nested` is populated, matching
 * the `method` discriminator.
 *
 * - `fixed`    → `fixed_value` holds a literal (string, number, bool, list)
 * - `from_var` → `from_path` holds a dotted path into working memory,
 *                optionally with a `list_to_dict_keyed_by` modifier
 * - `template` → `template` holds a Jinja2 template string (per-field)
 * - `nested`   → `nested` holds a recursive construct blueprint for building
 *                nested structured content
 */
export interface PipeComposeConstructField {
  method: "from_var" | "fixed" | "template" | "nested";
  fixed_value?: unknown;
  from_path?: string | null;
  template?: string | null;
  nested?: PipeComposeConstructBlueprint | null;
  list_to_dict_keyed_by?: string | null;
}

/**
 * A PipeCompose construct blueprint, parsed from `[pipe.X.construct]` in MTHDS.
 * Mirrors the `ConstructBlueprint` Pydantic model in pipelex.
 */
export interface PipeComposeConstructBlueprint {
  fields: Record<string, PipeComposeConstructField>;
}

/**
 * Per-field record of how each field was built at runtime, emitted by
 * `PipeCompose._run_construct_mode` in pipelex via `execution_data.fields`.
 *
 * - `method`   → which composition method was used (mirrors `ConstructFieldMethod`)
 * - `rendered` → present only for `template` fields, holds the Jinja2 output
 *
 * Nested fields record only their method; their sub-fields are not surfaced.
 */
export interface FieldResolution {
  method: "from_var" | "fixed" | "template" | "nested";
  rendered?: string;
}

export interface PipeComposeBlueprint extends PipeBlueprintBase {
  type: "PipeCompose";
  /** Legacy monolithic template. Null when construct_blueprint is used instead. */
  template: string | null;
  templating_style: string | null;
  category: string;
  extra_context: Record<string, unknown> | null;
  /** Field-level construct form (e.g. `[pipe.X.construct]` in MTHDS). */
  construct_blueprint: PipeComposeConstructBlueprint | null;
}

export interface PipeExtractBlueprint extends PipeBlueprintBase {
  type: "PipeExtract";
  extract_choice: string | null;
  should_caption_images: boolean;
  max_page_images: number | null;
  should_include_page_views: boolean;
  page_views_dpi: number | null;
  render_js: boolean | null;
  include_raw_html: boolean | null;
  image_stuff_name: string | null;
  document_stuff_name: string | null;
}

export interface PipeSearchBlueprint extends PipeBlueprintBase {
  type: "PipeSearch";
  search_choice: string | null;
  prompt_blueprint: TemplateBlueprint;
  include_images_override: boolean | null;
  max_results_override: number | null;
  from_date: string | null;
  to_date: string | null;
  include_domains: string[] | null;
  exclude_domains: string[] | null;
  is_structured_output: boolean;
}

export interface PipeFuncBlueprint extends PipeBlueprintBase {
  type: "PipeFunc";
}

/**
 * A PipeStructure: an LLM-backed operator that turns a single Text-compatible
 * input into a structured concept. Serialized from the runtime `PipeStructure`,
 * so the registry entry carries the runtime fields below alongside the base.
 */
export interface PipeStructureBlueprint extends PipeBlueprintBase {
  type: "PipeStructure";
  /**
   * LLM used to structure the text. A string model handle, an inline LLM
   * setting object, or null (→ resolved from the model deck's `for_object`
   * default at run time).
   */
  llm_choice: string | Record<string, unknown> | null;
  /** The single Text-compatible input variable the structuring reads. */
  text_input_name: string;
  /** `true` → let the LLM decide the count, a number → fixed count, null → single object. */
  output_multiplicity: boolean | number | null;
}

/**
 * A contract-only pipe: declares inputs + output but has no implementation.
 * Emitted under `--allow-signatures` so an in-progress bundle still validates
 * (dry-run mocks the declared output) before every referenced pipe is built.
 */
export interface PipeSignatureBlueprint extends Omit<PipeBlueprintBase, "pipe_category"> {
  type: "PipeSignature";
  /**
   * Signatures sit outside the executable taxonomy, so pipelex serializes
   * `pipe_category: null` (present, not omitted) — unlike operator/controller
   * blueprints which carry "PipeOperator" / "PipeController".
   */
  pipe_category: null;
  /** Intended downstream pipe type once implemented — an optional hint. */
  signature_for?: PipeType | null;
}

// ─── Controller blueprints ─────────────────────────────────────────────

export interface PipeSequenceBlueprint extends PipeBlueprintBase {
  type: "PipeSequence";
  sequential_sub_pipes: SubPipeSpec[];
}

export interface PipeParallelBlueprint extends PipeBlueprintBase {
  type: "PipeParallel";
  parallel_sub_pipes: SubPipeSpec[];
  add_each_output: boolean;
  combined_output: string | null;
}

export interface PipeConditionBlueprint extends PipeBlueprintBase {
  type: "PipeCondition";
  expression: string;
  outcome_map: Record<string, string>;
  default_outcome: string;
  add_alias_from_expression_to: string | null;
}

export interface PipeBatchBlueprint extends PipeBlueprintBase {
  type: "PipeBatch";
  branch_pipe_code: string;
  batch_params: { input_list_stuff_name: string; input_item_stuff_name: string };
}

export type PipeBlueprintUnion =
  | PipeLLMBlueprint
  | PipeImgGenBlueprint
  | PipeComposeBlueprint
  | PipeExtractBlueprint
  | PipeSearchBlueprint
  | PipeFuncBlueprint
  | PipeStructureBlueprint
  | PipeSignatureBlueprint
  | PipeSequenceBlueprint
  | PipeParallelBlueprint
  | PipeConditionBlueprint
  | PipeBatchBlueprint;

// ─── GraphSpec top-level ───────────────────────────────────────────────────

export interface GraphSpec {
  graph_id?: string;
  created_at?: string;
  pipeline_ref?: { domain?: string; main_pipe?: string; entrypoint?: string };
  nodes: GraphSpecNode[];
  edges: GraphSpecEdge[];
  meta?: GraphSpecMeta;
  pipe_registry?: Record<string, PipeBlueprintUnion>;
  concept_registry?: Record<string, ConceptInfo>;
}

export function graphSpecMode(
  spec: Pick<GraphSpec, "meta"> | null | undefined,
): GraphSpecMode | undefined {
  return spec?.meta?.mode;
}

export function isStaticGraphSpec(spec: Pick<GraphSpec, "meta"> | null | undefined): boolean {
  return graphSpecMode(spec) === GRAPH_SPEC_MODE.STATIC;
}

export function isDryGraphSpec(spec: Pick<GraphSpec, "meta"> | null | undefined): boolean {
  return graphSpecMode(spec) === GRAPH_SPEC_MODE.DRY;
}

// ─── Dataflow analysis result ───────────────────────────────────────────────

export interface DataflowAnalysis {
  readonly stuffRegistry: Readonly<
    Record<string, { name: string; concept?: string; contentType?: string }>
  >;
  readonly stuffProducers: Readonly<Record<string, string>>;
  readonly stuffConsumers: Readonly<Record<string, readonly string[]>>;
  readonly controllerNodeIds: ReadonlySet<string>;
  readonly childNodeIds: ReadonlySet<string>;
  readonly containmentTree: Readonly<Record<string, readonly string[]>>;
}

// ─── Graph configuration ────────────────────────────────────────────────────

export const GRAPH_DIRECTION = {
  TB: "TB",
  BT: "BT",
  LR: "LR",
  RL: "RL",
} as const;

export type GraphDirection = (typeof GRAPH_DIRECTION)[keyof typeof GRAPH_DIRECTION];

export const EDGE_TYPE = {
  /** Bezier curve — ReactFlow v12 renamed this type from "bezier" to "default". */
  DEFAULT: "default",
  STEP: "step",
  STRAIGHT: "straight",
  SMOOTH_STEP: "smoothstep",
} as const;

export type EdgeType = (typeof EDGE_TYPE)[keyof typeof EDGE_TYPE];

export const FOLD_MODE = {
  /** Every pipe controller folded into a single pipe card. */
  FOLDED: "folded",
  /** Every pipe controller expanded as a group wrapper. */
  EXPANDED: "expanded",
  /** Renderer decides — reserved for future heuristics; currently behaves like EXPANDED. */
  AUTO: "auto",
} as const;

export type FoldMode = (typeof FOLD_MODE)[keyof typeof FOLD_MODE];

/**
 * The *resolved* binary theme — the value that actually drives the palette and
 * the container class. `getPaletteForTheme` takes this. `system` is never a
 * resolved theme; it resolves to one of these via the environment.
 */
export const GRAPH_THEME = {
  DARK: "dark",
  LIGHT: "light",
} as const;

export type GraphTheme = (typeof GRAPH_THEME)[keyof typeof GRAPH_THEME];

/**
 * The user's theme *selection* — what the toolbar cycles, what gets persisted
 * and reported. `system` follows the host environment (browser `prefers-color-scheme`
 * or an injected `systemTheme`) and resolves to a binary `GraphTheme` at render
 * time. The `dark`/`light` overlap with `GraphTheme` is intentional: a resolved
 * theme is also a valid mode.
 */
export const GRAPH_THEME_MODE = {
  DARK: "dark",
  LIGHT: "light",
  SYSTEM: "system",
} as const;

export type GraphThemeMode = (typeof GRAPH_THEME_MODE)[keyof typeof GRAPH_THEME_MODE];

/**
 * Anchor for the built-in floating toolbar. The values match ReactFlow's
 * `PanelPosition` union exactly, so they pass straight to `<Panel position=…>`
 * (the React layer asserts that subset relationship at compile time). Orientation
 * is *derived* from the position, never configured independently — see
 * `toolbarOrientation`: only the two edge-center anchors are vertical, everything
 * else (corners + top/bottom-center) is a horizontal bar.
 *
 * `types.ts` stays React-free, so `PanelPosition` is intentionally NOT imported
 * here — the compatibility assertion lives in `GraphToolbar.tsx`.
 */
export const TOOLBAR_POSITION = {
  TOP_LEFT: "top-left",
  TOP_CENTER: "top-center",
  TOP_RIGHT: "top-right",
  BOTTOM_LEFT: "bottom-left",
  BOTTOM_CENTER: "bottom-center",
  BOTTOM_RIGHT: "bottom-right",
  CENTER_LEFT: "center-left",
  CENTER_RIGHT: "center-right",
} as const;

export type ToolbarPosition = (typeof TOOLBAR_POSITION)[keyof typeof TOOLBAR_POSITION];

export type ToolbarOrientation = "horizontal" | "vertical";

/**
 * Derive the bar orientation from its anchor. "Corners are horizontal, edges
 * decide the rest": only `center-left` / `center-right` produce a vertical bar;
 * every other position (the four corners plus `top-center` / `bottom-center`) is
 * horizontal. Pure + React-free so it is unit-testable without rendering.
 */
export function toolbarOrientation(position: ToolbarPosition): ToolbarOrientation {
  return position === TOOLBAR_POSITION.CENTER_LEFT || position === TOOLBAR_POSITION.CENTER_RIGHT
    ? "vertical"
    : "horizontal";
}

export type ToolbarSide = "left" | "center" | "right";

/**
 * Derive which edge the anchor hugs. The built-in `DetailPanel` overlays the
 * right edge, so only right-side anchors (`*-right`) need to dodge it — the
 * toolbar reads this to decide whether to shift left while the panel is open.
 * Pure + React-free so it is unit-testable without rendering, and exhaustively
 * switched so adding a `TOOLBAR_POSITION` value without a side fails to compile
 * — exactly like {@link toolbarOrientation}.
 */
export function toolbarSide(position: ToolbarPosition): ToolbarSide {
  switch (position) {
    case TOOLBAR_POSITION.TOP_LEFT:
    case TOOLBAR_POSITION.CENTER_LEFT:
    case TOOLBAR_POSITION.BOTTOM_LEFT:
      return "left";
    case TOOLBAR_POSITION.TOP_RIGHT:
    case TOOLBAR_POSITION.CENTER_RIGHT:
    case TOOLBAR_POSITION.BOTTOM_RIGHT:
      return "right";
    case TOOLBAR_POSITION.TOP_CENTER:
    case TOOLBAR_POSITION.BOTTOM_CENTER:
      return "center";
    default: {
      const _exhaustive: never = position;
      return _exhaustive;
    }
  }
}

// ─── Validation status (toolbar widget) ──────────────────────────────────────

/**
 * State of the toolbar's validation widget. The widget itself is opt-in: it
 * renders only when the host passes a `validationState` to `GraphViewer` —
 * `undefined` (the default) keeps it hidden entirely. The states describe the
 * host's validation lifecycle, not the static analyzer's: `validating` while a
 * verdict is being produced, `valid`/`invalid` once one exists, and `error`
 * when no verdict could be produced at all (validator unavailable, timeout…).
 */
export const VALIDATION_STATE = {
  VALIDATING: "validating",
  VALID: "valid",
  INVALID: "invalid",
  ERROR: "error",
} as const;

export type ValidationState = (typeof VALIDATION_STATE)[keyof typeof VALIDATION_STATE];

/**
 * One issue row in the validation panel. Mostly presentation: the host decides
 * which issues to show for each state (its validator's errors, the static
 * analyzer's diagnostics, or a mix) and handles navigation on row click. The
 * only fields the viewer interprets are the optional targeting fields
 * (`pipeRef` / `nodeId`), which drive node decorations on the graph.
 */
export interface ValidationIssue {
  severity: "error" | "warning";
  message: string;
  /** Short locator chip, e.g. `pipe.analyze_candidate` or a TOML path. */
  context?: string;
  /** Owning-file basename, when the issue lives in a specific file. */
  file?: string;
  /** Human-readable suggested fix, when the validator derived one. */
  suggestedFix?: string;
  /** Which analyzer produced the issue: the host's validator or the static parser. */
  origin?: "validator" | "static";
  /**
   * Fully-qualified pipe ref (`domain_code.pipe_code`, see `makePipeRef`) this
   * issue targets — decorates every rendered node invoking that pipe (a pipe
   * can be invoked from several places in the graph). Always qualified, never a
   * bare code: two domains may declare the same pipe code, and a bare match
   * would ring every same-code node. An emitter that cannot qualify must leave
   * the issue untargeted (panel-only) rather than decorate by guess.
   */
  pipeRef?: string;
  /**
   * Precise invocation this issue targets — a GraphSpec node id (e.g.
   * `demo.main_flow/step_2`). Takes precedence over `pipeRef` when both are
   * set. Issues with neither targeting field stay panel-only.
   */
  nodeId?: string;
}

/**
 * Aggregated validation decoration for one rendered node — derived from the
 * targeted `ValidationIssue`s by `buildValidationDecorations` (worst severity
 * wins, folded controllers roll up their hidden descendants' issues). Rendered
 * as a severity ring + count badge on the node, with `lines` as the tooltip.
 */
export interface NodeValidationSummary {
  /** Worst severity among the node's issues (`error` wins over `warning`). */
  severity: "error" | "warning";
  /** Number of issue hits on the node (a multi-instance pipe counts per invocation). */
  count: number;
  /** Tooltip lines: each issue's message, followed by a `Fix: …` line when present. */
  lines: string[];
}

export interface GraphConfig {
  direction?: GraphDirection;
  showControllers?: boolean;
  foldMode?: FoldMode;
  /**
   * Theme *mode*: `dark | light | system`. `system` follows the host environment.
   * Defaults to `system` (see `DEFAULT_GRAPH_CONFIG`). Pass `dark`/`light` to pin
   * a fixed appearance.
   */
  theme?: GraphThemeMode;
  /**
   * Anchor for the built-in floating toolbar (default `top-right`). Orientation
   * is derived from the position — see {@link toolbarOrientation}. The
   * `toolbarPosition` *prop* on `GraphViewer` takes precedence over this; both
   * are reactive and persistence is the host's responsibility.
   */
  toolbarPosition?: ToolbarPosition;
  nodesep?: number;
  ranksep?: number;
  edgeType?: EdgeType;
  initialZoom?: number | null;
  panToTop?: boolean;
  paletteColors?: Record<string, string>;
}

// ─── Label descriptors ──────────────────────────────────────────────────────
// Plain objects, no React dependency. GraphViewer maps these to React elements.

export type LabelDescriptor =
  | { kind: "pipe"; label: string; isFailed: boolean }
  | { kind: "stuff"; label: string; concept: string };

// ─── Fold toggle options ────────────────────────────────────────────────────
// Passed by UI click handlers so the orchestrator can decide whether the
// toggle should propagate to "cousin" controllers (other instances of the
// same pipe) or affect only the clicked one.

export interface FoldToggleOptions {
  /**
   * When `true`, the toggle applies only to the clicked controller — its
   * cousins (other controller nodes sharing the same `pipe_code`) are left
   * untouched. Wired to the alt/option modifier key in the click handlers.
   */
  soloMode?: boolean;
}

// ─── Pipe card payload ──────────────────────────────────────────────────────
// Built by graphBuilders, consumed by PipeCardNode in the React layer.

export interface PipeCardPayload {
  pipeCode: string;
  pipeType: PipeType;
  description?: string;
  status: PipeStatus;
  graphMode?: GraphSpecMode;
  inputs: { name: string; concept: string }[];
  outputs: { name: string; concept: string }[];
  /** Authored/static annotations and runtime tags carried by the GraphSpec node. */
  tags?: Record<string, string>;
  /** Layout direction — injected by the layout engine */
  direction?: "LR" | "TB";
  /** When set, the card renders an unfold button that invokes this callback. */
  onExpand?: (options?: FoldToggleOptions) => void;
  /** Validation decoration (severity ring + count badge), stamped by GraphViewer. */
  validation?: NodeValidationSummary;
  /** Badge click handler (opens the validation panel), stamped alongside `validation`. */
  onValidationBadgeClick?: () => void;
}

// ─── Graph node data ────────────────────────────────────────────────────────
// Extends Record<string, unknown> for ReactFlow's Node<T> generic parameter.

export type StuffRole = "input" | "output" | "combined";

export interface GraphNodeData extends Record<string, unknown> {
  labelDescriptor?: LabelDescriptor;
  label?: unknown;
  nodeData?: GraphSpecNode;
  isPipe: boolean;
  isStuff: boolean;
  isController?: boolean;
  labelText: string;
  pipeCode?: string;
  pipeType?: PipeType;
  graphMode?: GraphSpecMode;
  pipeCardData?: PipeCardPayload;
  /** For stuff nodes: "input" (no producer), "output" (no consumer), or undefined (intermediate). */
  stuffRole?: StuffRole;
  /** For stuff nodes: the digest used to build the node ID. */
  stuffDigest?: string;
  /** Validation decoration (severity ring + count badge), stamped by GraphViewer. */
  validation?: NodeValidationSummary;
  /** Badge click handler (opens the validation panel), stamped alongside `validation`. */
  onValidationBadgeClick?: () => void;
}

// ─── Graph node / edge / data ───────────────────────────────────────────────

export interface GraphNode {
  id: string;
  type: string;
  data: GraphNodeData;
  position: { x: number; y: number };
  style?: Record<string, string | number>;
  sourcePosition?: "top" | "bottom" | "left" | "right";
  targetPosition?: "top" | "bottom" | "left" | "right";
  parentId?: string;
  extent?: "parent";
  selected?: boolean;
}

export interface GraphEdge {
  id: string;
  source: string;
  target: string;
  type: string;
  animated?: boolean;
  label?: string;
  labelStyle?: Record<string, string | number>;
  labelBgStyle?: Record<string, string | number>;
  labelBgPadding?: [number, number];
  labelBgBorderRadius?: number;
  style?: Record<string, string | number>;
  markerEnd?: { type: string; color: string };
  _batchEdge?: boolean;
  _crossGroup?: boolean;
}

export interface GraphData {
  nodes: GraphNode[];
  edges: GraphEdge[];
}

// ─── Layout ─────────────────────────────────────────────────────────────────

export interface LayoutConfig {
  nodesep?: number;
  ranksep?: number;
}

// Controller padding constants (shared between layout and controller modules)
export const CONTROLLER_PADDING_X = 40;
export const CONTROLLER_PADDING_TOP = 48;
export const CONTROLLER_PADDING_BOTTOM = 20;

// Default marker type string (avoids ReactFlow dependency in pure modules)
export const ARROW_CLOSED_MARKER = "arrowclosed";

// ─── Node dimension helpers ─────────────────────────────────────────────────
// Extract dimensions from style. Used by buildControllerNodes.
// NOT used by getLayoutedElements, which estimates dimensions before styles exist.

export function nodeWidth(n: GraphNode): number {
  const raw = n.style?.width;
  if (raw == null) return 200;
  const w = typeof raw === "number" ? raw : parseFloat(raw);
  return isNaN(w) || w <= 0 ? 200 : w;
}

export function nodeHeight(n: GraphNode): number {
  const raw = n.style?.height;
  if (raw != null) {
    const h = typeof raw === "number" ? raw : parseFloat(raw);
    if (!isNaN(h) && h > 0) return h;
  }
  return n.data?.isStuff ? 60 : 70;
}
