#!/usr/bin/env node
/**
 * Consumer-shaped packaging smoke test.
 *
 * Packs the tarball, installs it into a throwaway directory and inspects the
 * package from the outside — the only vantage point from which the export map,
 * the externals and the `"use client"` directives are actually observable. A
 * plain `npm run build` cannot see any of it: the source tree resolves fine
 * even when the published artifact does not.
 *
 * The consumer is installed WITHOUT `@pipelex/mthds-form`, because that is what
 * "optional peer" has to mean and nothing in a normal dev tree tests it — the
 * kernel is always present there as a devDependency.
 *
 * What it checks, all of which have a history of failing silently:
 *
 * 1. Every declared export resolves to a file that exists. An unregistered
 *    stylesheet is dropped by tsup while the `className` stays in the JS, which
 *    is exactly how the v0.4.0 `GraphToolbar.css` regression shipped (CLAUDE.md,
 *    "CSS Packaging").
 * 2. `./form/react` carries `"use client"` — esbuild strips directive prologues.
 * 3. The kernel is left as a bare import, never inlined (design Decision B: a
 *    bundled copy is a second React context identity, so a host's
 *    `FieldStringsProvider` would not resolve inside the panel).
 * 4. The kernel is reachable from the form entry's module graph ONLY. Any other
 *    entry referencing it would break every graph-only consumer, who by
 *    construction has not installed it.
 *
 * Node cannot execute these entries directly (they import `.css`), so entry
 * loading is checked through `import.meta.resolve`, which walks the real export
 * map without evaluating the module.
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const failures = [];
function check(label, condition, detail) {
  process.stdout.write(
    condition ? `  ok    ${label}\n` : `  FAIL  ${label}${detail ? ` — ${detail}` : ""}\n`,
  );
  if (!condition) failures.push(label);
}

function run(command, args, cwd) {
  return execFileSync(command, args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

/**
 * The bare (non-relative) specifiers an entry pulls in, following relative
 * imports across tsup's shared chunks. Path prefixes are not enough on their
 * own: a chunk lives at `dist/chunk-*.js` regardless of which entries share it.
 */
function externalsOf(entryFile, seen = new Set(), acc = new Set()) {
  const resolved = path.resolve(entryFile);
  if (seen.has(resolved) || !existsSync(resolved)) return acc;
  seen.add(resolved);
  const source = readFileSync(resolved, "utf8");
  for (const match of source.matchAll(/(?:from|import)\s*["']([^"']+)["']/g)) {
    const specifier = match[1];
    if (specifier.startsWith(".")) {
      externalsOf(path.resolve(path.dirname(resolved), specifier), seen, acc);
    } else {
      acc.add(specifier);
    }
  }
  return acc;
}

const scratch = mkdtempSync(path.join(tmpdir(), "mthds-ui-smoke-"));
try {
  process.stdout.write("Packing the tarball...\n");
  const packed = run("npm", ["pack", "--pack-destination", scratch], repoRoot).trim();
  const tarball = path.join(scratch, packed.split("\n").pop().trim());

  process.stdout.write(`Installing ${path.basename(tarball)} into a bare consumer...\n`);
  run("npm", ["init", "-y"], scratch);
  run("npm", ["pkg", "set", "type=module"], scratch);
  run("npm", ["install", "--no-audit", "--no-fund", tarball, "react", "react-dom"], scratch);

  const installed = path.join(scratch, "node_modules", "@pipelex", "mthds-ui");
  const manifest = JSON.parse(readFileSync(path.join(installed, "package.json"), "utf8"));

  process.stdout.write("\nThe optional peer is genuinely absent\n");
  check(
    "@pipelex/mthds-form is not installed in the consumer",
    !existsSync(path.join(scratch, "node_modules", "@pipelex", "mthds-form")),
  );

  process.stdout.write("\nEvery declared export points at a real file\n");
  for (const [subpath, target] of Object.entries(manifest.exports)) {
    for (const file of typeof target === "string" ? [target] : Object.values(target)) {
      check(`${subpath} → ${file}`, existsSync(path.join(installed, file)));
    }
  }

  process.stdout.write("\nEntries resolve through the export map\n");
  for (const subpath of Object.keys(manifest.exports).filter((s) => !s.endsWith(".css"))) {
    const specifier = path.posix.join("@pipelex/mthds-ui", subpath);
    let resolved = "";
    try {
      resolved = run(
        "node",
        ["--input-type=module", "-e", `process.stdout.write(import.meta.resolve(${JSON.stringify(specifier)}))`],
        scratch,
      );
    } catch (error) {
      resolved = "";
      check(specifier, false, String(error.stderr ?? error.message).split("\n").find(Boolean));
      continue;
    }
    check(specifier, resolved.startsWith("file://"));
  }

  process.stdout.write("\nThe form entry is a client module that keeps the kernel external\n");
  const formEntryPath = path.join(installed, "dist/form/react/index.js");
  const formEntry = readFileSync(formEntryPath, "utf8");
  check('dist/form/react/index.js starts with "use client"', formEntry.startsWith('"use client"'));

  process.stdout.write("\nThe kernel is reachable from the form entry only\n");
  const isKernel = (specifier) =>
    specifier.split("/").slice(0, 2).join("/") === "@pipelex/mthds-form";
  const externalsPerEntry = new Map();
  for (const [subpath, target] of Object.entries(manifest.exports)) {
    if (typeof target === "string" || !target.import) continue;
    externalsPerEntry.set(subpath, [...externalsOf(path.join(installed, target.import))]);
  }
  for (const [subpath, externals] of externalsPerEntry) {
    if (subpath === "./form/react") continue;
    const kernelImports = externals.filter(isKernel);
    check(`${subpath} does not need the kernel`, kernelImports.length === 0, kernelImports.join(", "));
  }
  // The form entry may (and once the panel exists, must) import the kernel —
  // as a BARE specifier. A bundled copy would carry no such import while the
  // entry still renders fields, which is the failure this catches.
  const formExternals = externalsPerEntry.get("./form/react") ?? [];
  check(
    "./form/react imports the kernel rather than inlining it",
    formEntry.replace(/\/\/#.*$/m, "").trim() === '"use client";' || formExternals.some(isKernel),
    "the entry has code but no bare kernel import — it looks bundled",
  );
  check(
    "the kernel is declared an OPTIONAL peer",
    manifest.peerDependenciesMeta?.["@pipelex/mthds-form"]?.optional === true,
  );
} finally {
  rmSync(scratch, { recursive: true, force: true });
}

if (failures.length > 0) {
  process.stdout.write(`\n${failures.length} packaging check(s) failed.\n`);
  process.exit(1);
}
process.stdout.write("\nPackaging smoke test passed.\n");
