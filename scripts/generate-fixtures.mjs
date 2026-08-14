/**
 * Regenerate every generated artifact in data/pipelines/ from the bundles that live
 * there. Each bundle is run through the sibling `../pipelex` checkout; the resulting
 * graphspec.json becomes a typed Storybook fixture, and the rest of the run's output
 * is committed next to the bundle.
 *
 * Per pipeline, per mode (`dry_` / `live_` prefix):
 *
 *   <mode>_run_graph_spec.json    the GraphSpec — the contract the fixtures are built from
 *   <mode>_run_graph.html         standalone ReactFlow viewer for that run
 *   <mode>_run_mermaidflow.mmd    Mermaid source
 *   <mode>_run_mermaidflow.html   rendered Mermaid page
 *   live_run_main_stuff.json      what the live run actually produced (LIVE only)
 *   inputs_template.json          fill-in inputs template (offline, refreshed on DRY)
 *
 * This script is the ONLY writer of those files. Anything else in a pipeline directory
 * (bundle.mthds, inputs.json, inputs/, structures/) is hand-authored input.
 *
 *   node scripts/generate-fixtures.mjs                            DRY specs  -> _generated.dry.ts
 *   node scripts/generate-fixtures.mjs --live                     LIVE specs -> _generated.live.ts
 *   node scripts/generate-fixtures.mjs --only pipeline_04,...     restrict to a comma-separated list
 *   node scripts/generate-fixtures.mjs --missing                  only pipelines lacking an on-disk spec
 *   node scripts/generate-fixtures.mjs --from-disk                reassemble fixtures from on-disk specs, run nothing
 *   node scripts/generate-fixtures.mjs --check                    run + validate, write nothing
 *
 * DRY runs use --dry-run --mock-inputs (no inference, so zero tokens and no cost).
 * LIVE runs perform real inference and need pipelex credentials available.
 * Both resolve config from the repo-local .pipelex/ directory.
 * --check is a smoke test: useful with --live --only to confirm the live path
 * works before committing to a full regeneration.
 *
 * ALWAYS pass --only for a LIVE run. A full-corpus `make fixtures-live` sweeps
 * every fixture onto whatever pipelex the local CLI happens to be, and has no
 * skip path — any failure aborts partway, leaving a half-swept, mixed-version
 * tree. See wip/fixtures-live-corpus-regeneration.md.
 *
 * --only and --missing are partial runs: they regenerate just the selected
 * pipelines and reuse every other pipeline's existing *_run_graph_spec.json
 * from disk, so the emitted _generated.<mode>.ts always stays complete.
 * --missing selects the pipelines whose <mode>_run_graph_spec.json is absent —
 * the way to fill in just the gaps after a partial or failed run.
 */
import { execFileSync } from "node:child_process";
import {
  copyFileSync,
  mkdtempSync,
  mkdirSync,
  rmSync,
  readFileSync,
  writeFileSync,
  readdirSync,
  existsSync,
} from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PIPELEX_REPO = path.resolve(REPO, "../pipelex");
const PIPELEX_BIN =
  process.env.PIPELEX_BIN ??
  path.join(PIPELEX_REPO, ".venv", "bin", process.platform === "win32" ? "pipelex.exe" : "pipelex");
const PIPELINES_DIR = path.join(REPO, "data/pipelines");
const SPECS_DIR = path.join(REPO, "src/graph/react/viewer/__stories__/pipelines/specs");

/** Above this, prettier overflows its call stack on a single-line generated split. */
const PRETTIER_MAX_BYTES = 2 * 1024 * 1024;

/** pipeline_NN directory -> fixture export base name (DRY_<name> / LIVE_<name>). */
const NAME_MAP = {
  pipeline_01: "SINGLE_PIPE",
  pipeline_02: "TWO_PIPE_CHAIN",
  pipeline_03: "SIMPLE_SEQUENCE",
  pipeline_04: "LONG_SEQUENCE",
  pipeline_05: "SIMPLE_PARALLEL",
  pipeline_06: "THREE_WAY_PARALLEL",
  pipeline_07: "SIMPLE_CONDITION",
  pipeline_08: "SIMPLE_BATCH",
  pipeline_09: "CV_SCREENING",
  pipeline_10: "NESTED_SEQ_PAR_SEQ",
  pipeline_11: "NESTED_SEQ_COND_SEQ",
  pipeline_12: "BATCH_WITH_INNER_SEQ",
  pipeline_13: "DIAMOND_PATTERN",
  pipeline_14: "ALL_PIPE_TYPES",
  pipeline_15: "RAG_PIPELINE",
  pipeline_16: "IMAGE_PIPELINE",
  pipeline_17: "EMAIL_TRIAGE",
  pipeline_18: "CODE_REVIEW",
  pipeline_19: "CONTENT_MODERATION",
  pipeline_20: "WIDE_PARALLEL",
  pipeline_21: "MULTI_INPUT_CONVERGE",
  pipeline_22: "MULTI_OUTPUT_FANOUT",
  pipeline_23: "SIBLING_PARALLELS",
  pipeline_24: "DEEP_NESTING",
  pipeline_25: "ALL_CONTROLLER_TYPES",
  pipeline_26: "CV_MATCHING",
  pipeline_28: "CV_BATCH_SCREENING",
  pipeline_30: "CV_ANALYZER",
  pipeline_31: "RFP_QUALIFIER",
  pipeline_32: "MEETING_TRIAGE",
  pipeline_33: "AVAILABILITY_ROUTING",
  pipeline_34: "ALL_NATIVE_CONCEPTS",
};

const LIVE = process.argv.includes("--live");
const CHECK = process.argv.includes("--check");
const MISSING = process.argv.includes("--missing");
const FROM_DISK = process.argv.includes("--from-disk");
const MODE = LIVE ? "LIVE" : "DRY";
const MODE_VALUE = LIVE ? "live" : "dry";
const onlyArg = process.argv.indexOf("--only");
const ONLY = onlyArg !== -1 ? new Set(process.argv[onlyArg + 1].split(",")) : null;

/** Per-pipeline graphspec JSON written alongside the bundle (mode-specific). */
const SPEC_JSON_NAME = LIVE ? "live_run_graph_spec.json" : "dry_run_graph_spec.json";
const specJsonPath = (pipelineDir) => path.join(PIPELINES_DIR, pipelineDir, SPEC_JSON_NAME);

/**
 * The rest of the run's output, kept alongside the spec: CLI filename -> local name.
 *
 * The graphspec is the contract (it is what the Storybook fixtures are built from);
 * these are the human-facing renders of the same run, committed so a reviewer can open
 * a pipeline's graph without a pipelex checkout. Every name is mode-prefixed, so a DRY
 * and a LIVE regeneration of the same pipeline never overwrite each other.
 *
 * `main_stuff.json` is LIVE-only on purpose: a dry run's main stuff is the mock string
 * the runtime invented for `--mock-inputs`, so committing it would be pure diff churn
 * over a value that carries no information about the pipeline.
 */
const RUN_ARTIFACTS = [
  { from: "reactflow.html", to: "graph.html" },
  { from: "mermaidflow.mmd", to: "mermaidflow.mmd" },
  { from: "mermaidflow.html", to: "mermaidflow.html" },
  ...(LIVE ? [{ from: "main_stuff.json", to: "main_stuff.json" }] : []),
];

/** Mode-independent: the inputs template a caller fills in to run this pipeline. */
const INPUTS_TEMPLATE_NAME = "inputs_template.json";

function die(message) {
  console.error(`\n✗ generate-fixtures: ${message}\n`);
  process.exit(1);
}

function assertPipelexCliAvailable() {
  if (!existsSync(PIPELEX_BIN)) {
    die(
      `cannot find pipelex CLI at ${PIPELEX_BIN}. ` +
        `Set PIPELEX_BIN to an explicit CLI path or set up ../pipelex/.venv.`,
    );
  }
}

/**
 * Run one bundle through pipelex.
 *
 * Returns the parsed graphspec plus the run's output directory and a `cleanup()` the
 * caller MUST call. The temp dir outlives this function on purpose: the caller validates
 * the spec first and only then copies the rest of the run's artifacts, so a spec that
 * fails validation never leaves a refreshed graph.html next to a rejected spec.
 */
function runBundle(pipelineDir) {
  const bundle = path.join(PIPELINES_DIR, pipelineDir, "bundle.mthds");
  if (!existsSync(bundle)) die(`${pipelineDir}: missing bundle.mthds`);

  const tmp = mkdtempSync(path.join(tmpdir(), `fixtures-${pipelineDir}-`));
  const cleanup = () => rmSync(tmp, { recursive: true, force: true });
  try {
    const args = ["run", "bundle", bundle, "--graph", "-o", tmp];
    if (LIVE) {
      const inputs = path.join(PIPELINES_DIR, pipelineDir, "inputs.json");
      if (!existsSync(inputs)) die(`${pipelineDir}: missing inputs.json (required for a LIVE run)`);
      args.push("-i", inputs);
    } else {
      // Deliberately NOT --mock-usage. That flag makes a dry run report invented
      // token counts, and a dry run executes nothing — the numbers would be
      // fabrications rendered as measurements. A DRY spec carries usage objects
      // with zero tokens and a null cost, which is the truth about a dry run.
      args.push("--dry-run", "--mock-inputs");
    }

    try {
      execFileSync(PIPELEX_BIN, args, {
        cwd: REPO,
        env: { ...process.env, PIPELEX_NO_DECK_NOTICE: "1" },
        stdio: ["ignore", "pipe", "pipe"],
        // Node defaults maxBuffer to 1MB and throws ENOBUFS past it, which this
        // script would then report as "pipelex run failed" — blaming the pipeline
        // for a pipe-capacity problem. pipelex echoes every pipe's output, so a
        // batch pipeline over a dozen records clears 1MB easily (pipeline_12 emits
        // ~3MB while exiting 0). Generous ceiling; the output is only read on error.
        maxBuffer: 256 * 1024 * 1024,
      });
    } catch (err) {
      console.error(err.stdout?.toString() ?? "");
      console.error(err.stderr?.toString() ?? "");
      die(`${pipelineDir}: pipelex run failed`);
    }

    const outputDirs = readdirSync(tmp).filter((d) => d.includes("_output_"));
    if (outputDirs.length === 0) die(`${pipelineDir}: pipelex produced no *_output_* directory`);
    if (outputDirs.length > 1) {
      die(
        `${pipelineDir}: pipelex produced multiple *_output_* directories ` +
          `(${outputDirs.join(", ")}) — cannot pick the graphspec unambiguously`,
      );
    }
    const outDir = path.join(tmp, outputDirs[0]);
    const specPath = path.join(outDir, "graphspec.json");
    if (!existsSync(specPath)) die(`${pipelineDir}: no graphspec.json at ${specPath}`);

    return { spec: JSON.parse(readFileSync(specPath, "utf-8")), outDir, cleanup };
  } catch (err) {
    cleanup();
    throw err;
  }
}

/**
 * Copy the run's non-spec artifacts next to the bundle under their mode-prefixed names.
 *
 * Every entry in RUN_ARTIFACTS must be present: the CLI emits them from one config
 * (`graphs_inclusion` in .pipelex/pipelex.toml), so a missing file means that config
 * drifted, not that this pipeline is special. Failing loudly here beats silently
 * committing a pipeline with half its renders.
 */
function copyRunArtifacts(pipelineDir, outDir) {
  for (const { from, to } of RUN_ARTIFACTS) {
    const src = path.join(outDir, from);
    if (!existsSync(src)) {
      die(
        `${pipelineDir}: pipelex emitted no ${from} — check graphs_inclusion in ` +
          `.pipelex/pipelex.toml (all outputs must stay enabled for fixture generation)`,
      );
    }
    copyFileSync(src, path.join(PIPELINES_DIR, pipelineDir, `${MODE_VALUE}_run_${to}`));
  }
}

/**
 * Write the pipe's inputs template alongside the bundle.
 *
 * Offline projection from the resolved crate — no engine, no inference — so it is
 * regenerated on the free DRY pass and left untouched by a paid LIVE one.
 */
function writeInputsTemplate(pipelineDir) {
  const out = path.join(PIPELINES_DIR, pipelineDir, INPUTS_TEMPLATE_NAME);
  try {
    execFileSync(
      PIPELEX_BIN,
      ["codegen", "inputs", path.join(PIPELINES_DIR, pipelineDir), "--explicit", "-o", out],
      {
        cwd: REPO,
        env: { ...process.env, PIPELEX_NO_DECK_NOTICE: "1" },
        stdio: ["ignore", "pipe", "pipe"],
        maxBuffer: 16 * 1024 * 1024,
      },
    );
  } catch (err) {
    console.error(err.stdout?.toString() ?? "");
    console.error(err.stderr?.toString() ?? "");
    die(`${pipelineDir}: pipelex codegen inputs failed`);
  }
}

/**
 * Gate the per-node usage attribution a FRESHLY generated spec must carry.
 *
 * Applied only to specs this invocation ran through pipelex — a spec reused from
 * disk may predate usage attribution, and failing on it would brick every partial
 * (`--only` / `--missing`) run against an older corpus.
 *
 * The checks are deliberately NOT "every node made an inference call": controllers,
 * PipeFunc, PipeCompose, skipped and lifted pipes legitimately report zero. What must
 * hold is the shape of the attribution itself.
 */
function assertUsageAttribution(spec, pipelineDir) {
  if (!spec.usage) {
    die(
      `${pipelineDir}: spec carries no graph-level usage — the ../pipelex checkout predates ` +
        `per-node usage attribution, or usage collection was off for the run`,
    );
  }
  if (spec.usage.unattributed?.inference_calls !== 0) {
    die(
      `${pipelineDir}: ${spec.usage.unattributed?.inference_calls} inference call(s) could not be ` +
        `attributed to a node (graph.usage.unattributed) — every call in a local run should name its pipe`,
    );
  }

  // Invariant 1 is all-or-nothing: once any usage was reported, EVERY node carries a
  // spec, zeroed where nothing ran. A null here means the attribution half-landed.
  for (const node of spec.nodes) {
    if (!node.usage) die(`${pipelineDir}: node ${node.id} has no usage while the graph has some`);
  }

  if (!LIVE) {
    // A dry/mock run has no rate table, so it is unrated by construction. A number here
    // would mean a synthetic call was priced — the exact thing that must never render
    // as a real dollar in Storybook.
    for (const node of spec.nodes) {
      if (node.usage.cost !== null || node.usage.subtree_cost !== null) {
        die(
          `${pipelineDir}: node ${node.id} has a non-null DRY cost (${node.usage.cost}) — DRY must always be unrated`,
        );
      }
    }
    // No token assertion here on purpose: a dry run executes nothing, so zero
    // tokens is the correct result, not a symptom.
  }

  // Rollup sanity: a CONTAINS parent's subtree must cover each of its children's.
  const usageById = new Map(spec.nodes.map((node) => [node.id, node.usage]));
  for (const edge of spec.edges ?? []) {
    if (edge.kind !== "contains") continue;
    const parent = usageById.get(edge.source);
    const child = usageById.get(edge.target);
    if (!parent || !child) continue;
    if (
      parent.subtree_total_tokens < child.subtree_total_tokens ||
      parent.subtree_inference_calls < child.subtree_inference_calls
    ) {
      die(
        `${pipelineDir}: subtree rollup is inconsistent — ${edge.source} contains ${edge.target} ` +
          `but reports fewer subtree tokens/calls (${parent.subtree_total_tokens} < ${child.subtree_total_tokens})`,
      );
    }
  }
}

/**
 * Reject any spec the wired-in validateGraphSpec would also reject.
 *
 * `isFresh` marks a spec this invocation just generated; only those are held to the
 * usage-attribution gate (see assertUsageAttribution).
 */
function assertValid(spec, pipelineDir, { isFresh } = { isFresh: true }) {
  if (spec?.meta?.format !== "mthds") {
    die(`${pipelineDir}: meta.format is not "mthds" (got ${JSON.stringify(spec?.meta)})`);
  }
  if (spec.meta.mode !== MODE_VALUE) {
    die(`${pipelineDir}: meta.mode is not "${MODE_VALUE}" (got ${JSON.stringify(spec.meta)})`);
  }
  if (!Array.isArray(spec.nodes) || spec.nodes.length === 0) {
    die(`${pipelineDir}: spec has no nodes`);
  }
  for (const node of spec.nodes) {
    if (!node.description) die(`${pipelineDir}: node ${node.id} has no description`);
    if (!node.domain_code) die(`${pipelineDir}: node ${node.id} has no domain_code`);
  }
  if (isFresh) assertUsageAttribution(spec, pipelineDir);
}

/**
 * Prettier-format a generated split, falling back to the raw text when it is too big.
 *
 * The split is one enormous single-line `JSON.stringify`, and prettier parses that
 * into an AST deep enough to blow Node's call stack past a few megabytes — it throws
 * `RangeError: Maximum call stack size exceeded`. That is fatal in a way out of all
 * proportion to what formatting buys here: the file is machine-written, machine-read,
 * and marked DO NOT EDIT, so nobody is reading its indentation. Worse, every
 * invocation rewrites *every* split, so a single oversized fixture would fail the
 * generator for pipelines that ran perfectly — after their inference was paid for.
 *
 * Unformatted output is still valid TypeScript; prettier's own check is scoped to
 * `src/**` and these live under it, so `.prettierignore` covers the generated dir.
 */
async function formatSplit(splitRaw, prettierConfig) {
  if (splitRaw.length > PRETTIER_MAX_BYTES) {
    console.warn(
      `  ⚠ split is ${(splitRaw.length / 1048576).toFixed(1)}MB — writing unformatted ` +
        `(prettier overflows its stack past ~${(PRETTIER_MAX_BYTES / 1048576).toFixed(0)}MB)`,
    );
    return splitRaw;
  }
  return prettier.format(splitRaw, { ...prettierConfig, parser: "typescript" });
}

async function main() {
  const allPipelines = Object.keys(NAME_MAP)
    .filter((p) => existsSync(path.join(PIPELINES_DIR, p, "bundle.mthds")))
    .sort();

  if (allPipelines.length === 0) die("no pipelines found");

  // toProcess: pipelines actually run through pipelex this invocation.
  let toProcess;
  if (FROM_DISK) {
    toProcess = [];
  } else if (MISSING) {
    toProcess = allPipelines.filter((p) => !existsSync(specJsonPath(p)));
  } else if (ONLY) {
    const unknown = [...ONLY].filter((p) => !allPipelines.includes(p));
    if (unknown.length > 0) die(`unknown pipeline(s) in --only: ${unknown.join(",")}`);
    toProcess = allPipelines.filter((p) => ONLY.has(p));
  } else {
    toProcess = allPipelines;
  }
  const PARTIAL = Boolean(MISSING || ONLY);

  if (toProcess.length === 0 && !FROM_DISK) {
    // Only reachable via --missing when every spec is already present.
    console.log(`generate-fixtures: ${MODE} — nothing missing, all ${SPEC_JSON_NAME} present`);
    return;
  }

  console.log(
    `generate-fixtures: ${MODE} run over ${toProcess.length}` +
      `${PARTIAL ? `/${allPipelines.length}` : ""} pipeline(s)` +
      `${CHECK ? " [check — no files written]" : ""}` +
      `${FROM_DISK ? " [from disk]" : ""}`,
  );
  // Pure-disk flows (--from-disk, or --missing with nothing missing) never
  // invoke pipelex, so only require the CLI when something will be generated.
  if (toProcess.length > 0) {
    assertPipelexCliAvailable();
    console.log(`  using pipelex CLI: ${path.relative(REPO, PIPELEX_BIN)}`);
  }

  // name -> spec, assembled in allPipelines order for a stable output file.
  const specByName = new Map();
  for (const pipelineDir of toProcess) {
    process.stdout.write(`  ${pipelineDir} ... `);
    const { spec, outDir, cleanup } = runBundle(pipelineDir);
    try {
      assertValid(spec, pipelineDir);
      specByName.set(NAME_MAP[pipelineDir], spec);

      // Keep the on-disk artifacts in sync with the emitted fixture: the spec is the
      // contract, the rest of the run's output is the reviewable render of it.
      if (!CHECK) {
        writeFileSync(specJsonPath(pipelineDir), JSON.stringify(spec, null, 2) + "\n");
        copyRunArtifacts(pipelineDir, outDir);
        if (!LIVE) writeInputsTemplate(pipelineDir);
      }
    } finally {
      cleanup();
    }
    console.log(`ok (${spec.nodes.length} nodes)`);
  }

  if (CHECK) {
    console.log(`\n✓ check passed — ${specByName.size} ${MODE} spec(s) validated, nothing written`);
    return;
  }

  // A partial/from-disk run only regenerated a subset; reuse every other
  // pipeline's on-disk spec so the emitted fixtures stay complete.
  if (PARTIAL || FROM_DISK) {
    const reused = [];
    const omitted = [];
    for (const p of allPipelines) {
      if (specByName.has(NAME_MAP[p])) continue;
      if (existsSync(specJsonPath(p))) {
        const spec = JSON.parse(readFileSync(specJsonPath(p), "utf-8"));
        assertValid(spec, p, { isFresh: false });
        specByName.set(NAME_MAP[p], spec);
        reused.push(p);
      } else {
        omitted.push(p);
      }
    }
    console.log(`  (reused ${reused.length} existing ${MODE} spec(s) from disk)`);
    if (omitted.length > 0) {
      console.warn(
        `  ⚠ omitted ${omitted.length} pipeline(s) with no ${SPEC_JSON_NAME}: ${omitted.join(", ")}`,
      );
    }
  }

  const specs = allPipelines
    .filter((p) => specByName.has(NAME_MAP[p]))
    .map((p) => ({ pipelineDir: p, name: NAME_MAP[p], spec: specByName.get(NAME_MAP[p]) }));

  const prefix = LIVE ? "LIVE" : "DRY";
  const generatedDir = path.join(SPECS_DIR, "_generated", LIVE ? "live" : "dry");
  const prettierConfig = (await prettier.resolveConfig(SPECS_DIR)) ?? {};
  mkdirSync(generatedDir, { recursive: true });

  for (const { pipelineDir, name, spec } of specs) {
    const splitRaw =
      `/**\n` +
      ` * Auto-generated by scripts/generate-fixtures.mjs from pipelex ${MODE} runs.\n` +
      ` * DO NOT EDIT — regenerate with \`make fixtures${LIVE ? "-live" : ""}\`.\n` +
      ` */\n` +
      `import type { GraphSpec } from "@graph/types";\n\n` +
      `export const ${prefix}_${name} = ${JSON.stringify(spec)} as unknown as GraphSpec;\n`;
    writeFileSync(
      path.join(generatedDir, `${pipelineDir}.ts`),
      await formatSplit(splitRaw, prettierConfig),
    );
  }

  /**
   * (Re)write a mode's barrel from the split modules present on disk.
   *
   * The barrel's contract is "re-export every per-pipeline split", so it must be
   * derived from the splits themselves — never from the specs a given invocation
   * happened to assemble. A partial run (`--only`) reuses most pipelines from
   * disk and omits any with no on-disk spec at all (a pipeline pipelex cannot
   * run live has no `live_run_graph_spec.json`); deriving the barrel from that
   * truncated list drops exports the stories import and breaks typecheck.
   */
  async function writeBarrel(mode) {
    const barrelPrefix = mode === "live" ? "LIVE" : "DRY";
    const splitDir = path.join(SPECS_DIR, "_generated", mode);
    const present = allPipelines.filter((p) => existsSync(path.join(splitDir, `${p}.ts`)));
    const raw =
      `/**\n` +
      ` * Auto-generated by scripts/generate-fixtures.mjs — re-exports the\n` +
      ` * per-pipeline ${barrelPrefix} split modules. DO NOT EDIT.\n` +
      ` * Regenerate with \`make fixtures${mode === "live" ? "-live" : ""}\`.\n` +
      ` */\n` +
      present
        .map((p) => `export { ${barrelPrefix}_${NAME_MAP[p]} } from "./_generated/${mode}/${p}";`)
        .join("\n\n") +
      `\n`;
    const outPath = path.join(SPECS_DIR, `_generated.${mode}.ts`);
    writeFileSync(outPath, await prettier.format(raw, { ...prettierConfig, parser: "typescript" }));
    return { outPath, count: present.length };
  }

  const barrel = await writeBarrel(MODE_VALUE);
  console.log(`\n✓ wrote ${path.relative(REPO, barrel.outPath)} (${barrel.count} specs)`);

  // Bootstrap a LIVE placeholder layer so a plain `make fixtures` is enough to
  // build Storybook without a paid live run. The pipeline stories import LIVE
  // specs from the per-pipeline split modules (not the barrel), so a barrel-only
  // placeholder is not enough — we must emit a matching split for every pipeline
  // that lacks real LIVE data. Each write is guarded by existsSync so a real
  // `make fixtures-live` output is never clobbered.
  //
  // Partial runs bootstrap too: a newly added pipeline is generated with
  // `--only`, and without this its story's LIVE import would not resolve.
  if (!LIVE) {
    const liveDir = path.join(SPECS_DIR, "_generated", "live");
    mkdirSync(liveDir, { recursive: true });

    let placeholdersWritten = 0;
    for (const { pipelineDir, name } of specs) {
      const liveSplit = path.join(liveDir, `${pipelineDir}.ts`);
      if (existsSync(liveSplit)) continue; // keep real LIVE data
      const placeholderRaw =
        `/**\n` +
        ` * PLACEHOLDER — wraps the DRY spec as LIVE so Storybook builds\n` +
        ` * without a paid live run. Run \`make fixtures-live\` for real LIVE data.\n` +
        ` */\n` +
        `import type { GraphSpec } from "@graph/types";\n` +
        `import { DRY_${name} } from "../dry/${pipelineDir}";\n\n` +
        `export const LIVE_${name} = {\n` +
        `  ...DRY_${name},\n` +
        `  meta: { ...DRY_${name}.meta, format: "mthds", mode: "live" },\n` +
        `} as GraphSpec;\n`;
      writeFileSync(
        liveSplit,
        await prettier.format(placeholderRaw, { ...prettierConfig, parser: "typescript" }),
      );
      placeholdersWritten++;
    }

    // Always (re)write the LIVE barrel. It is derived from the splits on disk, so
    // it is idempotent when nothing changed and never loses real LIVE data —
    // and writing it unconditionally self-heals a barrel left stale by an
    // earlier partial LIVE run.
    await writeBarrel("live");

    if (placeholdersWritten > 0) {
      console.log(
        `  wrote ${placeholdersWritten} LIVE placeholder split(s) — run \`make fixtures-live\` for real data`,
      );
    }
  }
}

main();
