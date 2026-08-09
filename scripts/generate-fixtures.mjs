/**
 * Regenerate Storybook GraphSpec fixtures from the pipelex bundles in
 * data/pipelines/. Each bundle is run through the sibling `../pipelex`
 * checkout and the resulting graphspec.json is emitted as a typed fixture consumed by
 * mockGraphSpec.ts.
 *
 *   node scripts/generate-fixtures.mjs                            DRY specs  -> _generated.dry.ts
 *   node scripts/generate-fixtures.mjs --live                     LIVE specs -> _generated.live.ts
 *   node scripts/generate-fixtures.mjs --only pipeline_04,...     restrict to a comma-separated list
 *   node scripts/generate-fixtures.mjs --missing                  only pipelines lacking an on-disk spec
 *   node scripts/generate-fixtures.mjs --check                    run + validate, write nothing
 *
 * DRY runs use --dry-run --mock-inputs (deterministic, no inference).
 * LIVE runs perform real inference and need pipelex credentials available.
 * Both resolve config from the repo-local .pipelex/ directory.
 * --check is a smoke test: useful with --live --only to confirm the live path
 * works before committing to a full regeneration.
 *
 * --only and --missing are partial runs: they regenerate just the selected
 * pipelines and reuse every other pipeline's existing *_run_graph_spec.json
 * from disk, so the emitted _generated.<mode>.ts always stays complete.
 * --missing selects the pipelines whose <mode>_run_graph_spec.json is absent —
 * the way to fill in just the gaps after a partial or failed run.
 */
import { execFileSync } from "node:child_process";
import {
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
      execFileSync(PIPELEX_BIN, args, {
        cwd: REPO,
        env: { ...process.env, PIPELEX_NO_DECK_NOTICE: "1" },
        stdio: ["ignore", "pipe", "pipe"],
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
    const specPath = path.join(tmp, outputDirs[0], "graphspec.json");
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
    const spec = generateSpec(pipelineDir);
    assertValid(spec, pipelineDir);
    specByName.set(NAME_MAP[pipelineDir], spec);

    // Keep the data/pipelines JSON in sync with the emitted fixture.
    if (!CHECK) {
      writeFileSync(specJsonPath(pipelineDir), JSON.stringify(spec, null, 2) + "\n");
    }
    console.log(`ok (${spec.nodes.length} nodes)`);
  }

  if (CHECK) {
    console.log(`\n✓ check passed — ${specByName.size} ${MODE} spec(s) validated, nothing written`);
    return;
  }

  // A partial/from-disk run only regenerated a subset; reuse every other
  // pipeline's on-disk spec so the emitted fixtures stay complete.
  let omitted = [];
  if (PARTIAL || FROM_DISK) {
    const reused = [];
    for (const p of allPipelines) {
      if (specByName.has(NAME_MAP[p])) continue;
      if (existsSync(specJsonPath(p))) {
        const spec = JSON.parse(readFileSync(specJsonPath(p), "utf-8"));
        assertValid(spec, p);
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
      await prettier.format(splitRaw, { ...prettierConfig, parser: "typescript" }),
    );
  }

  const body = specs
    .map(
      ({ pipelineDir, name }) =>
        `export { ${prefix}_${name} } from "./_generated/${LIVE ? "live" : "dry"}/${pipelineDir}";`,
    )
    .join("\n\n");
  const raw =
    `/**\n` +
    ` * Auto-generated by scripts/generate-fixtures.mjs from pipelex ${MODE} runs.\n` +
    ` * DO NOT EDIT — regenerate with \`make fixtures${LIVE ? "-live" : ""}\`.\n` +
    ` */\n` +
    body +
    `\n`;

  const formatted = await prettier.format(raw, { ...prettierConfig, parser: "typescript" });

  const outFile = path.join(SPECS_DIR, LIVE ? "_generated.live.ts" : "_generated.dry.ts");
  writeFileSync(outFile, formatted);
  console.log(`\n✓ wrote ${path.relative(REPO, outFile)} (${specs.length} specs)`);

  // Bootstrap a LIVE placeholder layer so a plain `make fixtures` is enough to
  // build Storybook without a paid live run. The pipeline stories import LIVE
  // specs from the per-pipeline split modules (not the barrel), so a barrel-only
  // placeholder is not enough — we must emit a matching split for every pipeline
  // that lacks real LIVE data. Each write is guarded by existsSync so a real
  // `make fixtures-live` output is never clobbered.
  //
  // Partial runs bootstrap too: a newly added pipeline is generated with
  // `--only`, and without this its story's LIVE import would not resolve. The
  // barrel is only rewritten when nothing was omitted, so a partial run can
  // never drop a pipeline's LIVE export.
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

    // (Re)write the LIVE barrel when it is missing or we just filled gaps. It only
    // re-exports the per-pipeline split modules, so this matches a real
    // `make fixtures-live` barrel in shape and never loses real LIVE data.
    const liveFile = path.join(SPECS_DIR, "_generated.live.ts");
    if (omitted.length === 0 && (!existsSync(liveFile) || placeholdersWritten > 0)) {
      const barrelRaw =
        `/**\n` +
        ` * PLACEHOLDER barrel — re-exports the per-pipeline LIVE split modules.\n` +
        ` * Run \`make fixtures-live\` to replace the placeholder splits with real data.\n` +
        ` */\n` +
        specs
          .map(
            ({ name, pipelineDir }) =>
              `export { LIVE_${name} } from "./_generated/live/${pipelineDir}";`,
          )
          .join("\n\n") +
        `\n`;
      writeFileSync(
        liveFile,
        await prettier.format(barrelRaw, { ...prettierConfig, parser: "typescript" }),
      );
    }

    if (placeholdersWritten > 0) {
      console.log(
        `  wrote ${placeholdersWritten} LIVE placeholder split(s) — run \`make fixtures-live\` for real data`,
      );
    }
  }
}

main();
