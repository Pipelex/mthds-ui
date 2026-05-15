/**
 * Regenerate Storybook GraphSpec fixtures from the pipelex bundles in
 * data/pipelines/. Each bundle is run through `pipelex ... --graph` and the
 * resulting graphspec.json is emitted as a typed fixture consumed by
 * mockGraphSpec.ts.
 *
 *   node scripts/generate-fixtures.mjs                   DRY specs  -> _generated.dry.ts
 *   node scripts/generate-fixtures.mjs --live            LIVE specs -> _generated.live.ts
 *   node scripts/generate-fixtures.mjs --only pipeline_09
 *
 * DRY runs use --dry-run --mock-inputs (deterministic, no inference).
 * LIVE runs perform real inference and need pipelex credentials available.
 * Both resolve config from the repo-local .pipelex/ directory.
 */
import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, readFileSync, writeFileSync, readdirSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import prettier from "prettier";

const REPO = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const PIPELINES_DIR = path.join(REPO, "data/pipelines");
const SPECS_DIR = path.join(REPO, "src/graph/react/viewer/__stories__/pipelines/specs");

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
};

const LIVE = process.argv.includes("--live");
const MODE = LIVE ? "LIVE" : "DRY";
const onlyArg = process.argv.indexOf("--only");
const ONLY = onlyArg !== -1 ? process.argv[onlyArg + 1] : null;

function die(message) {
  console.error(`\n✗ generate-fixtures: ${message}\n`);
  process.exit(1);
}

/** Run one bundle through pipelex and return the parsed graphspec.json. */
function generateSpec(pipelineDir) {
  const bundle = path.join(PIPELINES_DIR, pipelineDir, "bundle.mthds");
  if (!existsSync(bundle)) die(`${pipelineDir}: missing bundle.mthds`);

  const tmp = mkdtempSync(path.join(tmpdir(), `fixtures-${pipelineDir}-`));
  try {
    const args = ["run", "bundle", bundle, "--graph", "-o", tmp];
    if (LIVE) {
      const inputs = path.join(PIPELINES_DIR, pipelineDir, "inputs.json");
      if (!existsSync(inputs)) die(`${pipelineDir}: missing inputs.json (required for a LIVE run)`);
      args.push("-i", inputs);
    } else {
      args.push("--dry-run", "--mock-inputs");
    }

    try {
      execFileSync("pipelex", args, {
        cwd: REPO,
        env: { ...process.env, PIPELEX_NO_DECK_NOTICE: "1" },
        stdio: ["ignore", "pipe", "pipe"],
      });
    } catch (err) {
      console.error(err.stdout?.toString() ?? "");
      console.error(err.stderr?.toString() ?? "");
      die(`${pipelineDir}: pipelex run failed`);
    }

    const outputDir = readdirSync(tmp).find((d) => d.includes("_output_"));
    if (!outputDir) die(`${pipelineDir}: pipelex produced no *_output_* directory`);
    const specPath = path.join(tmp, outputDir, "graphspec.json");
    if (!existsSync(specPath)) die(`${pipelineDir}: no graphspec.json at ${specPath}`);

    return JSON.parse(readFileSync(specPath, "utf-8"));
  } finally {
    rmSync(tmp, { recursive: true, force: true });
  }
}

/** Reject any spec the wired-in validateGraphSpec would also reject. */
function assertValid(spec, pipelineDir) {
  if (spec?.meta?.format !== "mthds") {
    die(`${pipelineDir}: meta.format is not "mthds" (got ${JSON.stringify(spec?.meta)})`);
  }
  if (!Array.isArray(spec.nodes) || spec.nodes.length === 0) {
    die(`${pipelineDir}: spec has no nodes`);
  }
  for (const node of spec.nodes) {
    if (!node.description) die(`${pipelineDir}: node ${node.id} has no description`);
    if (!node.domain_code) die(`${pipelineDir}: node ${node.id} has no domain_code`);
  }
}

async function main() {
  const pipelines = Object.keys(NAME_MAP)
    .filter((p) => existsSync(path.join(PIPELINES_DIR, p, "bundle.mthds")))
    .filter((p) => !ONLY || p === ONLY)
    .sort();

  if (pipelines.length === 0) die(ONLY ? `no pipeline matching --only ${ONLY}` : "no pipelines found");

  console.log(`generate-fixtures: ${MODE} run over ${pipelines.length} pipeline(s)`);

  const specs = [];
  for (const pipelineDir of pipelines) {
    process.stdout.write(`  ${pipelineDir} ... `);
    const spec = generateSpec(pipelineDir);
    assertValid(spec, pipelineDir);
    specs.push({ name: NAME_MAP[pipelineDir], spec });

    // Keep the data/pipelines JSON in sync with the emitted fixture.
    const jsonName = LIVE ? "live_run_graph_spec.json" : "dry_run_graph_spec.json";
    writeFileSync(
      path.join(PIPELINES_DIR, pipelineDir, jsonName),
      JSON.stringify(spec, null, 2) + "\n",
    );
    console.log(`ok (${spec.nodes.length} nodes)`);
  }

  const prefix = LIVE ? "LIVE" : "DRY";
  const body = specs
    .map(
      ({ name, spec }) =>
        `export const ${prefix}_${name} = ${JSON.stringify(spec)} as unknown as GraphSpec;`,
    )
    .join("\n\n");
  const raw =
    `/**\n` +
    ` * Auto-generated by scripts/generate-fixtures.mjs from pipelex ${MODE} runs.\n` +
    ` * DO NOT EDIT — regenerate with \`make fixtures${LIVE ? "-live" : ""}\`.\n` +
    ` */\n` +
    `import type { GraphSpec } from "@graph/types";\n\n` +
    body +
    `\n`;

  const prettierConfig = (await prettier.resolveConfig(SPECS_DIR)) ?? {};
  const formatted = await prettier.format(raw, { ...prettierConfig, parser: "typescript" });

  const outFile = path.join(SPECS_DIR, LIVE ? "_generated.live.ts" : "_generated.dry.ts");
  writeFileSync(outFile, formatted);
  console.log(`\n✓ wrote ${path.relative(REPO, outFile)} (${specs.length} specs)`);
}

main();
