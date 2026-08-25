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
 * 1. Every declared export resolves to a file that exists, AND every exported
 *    stylesheet is actually imported by the JS that needs it. Existence alone
 *    is not the v0.4.0 `GraphToolbar.css` regression: the `onSuccess` copy puts
 *    the file in `dist/` no matter what, so an unregistered stylesheet still
 *    resolves through the export map while tsup has folded it into a
 *    `dist/<entry>/index.css` nobody imports and the `className` ships unstyled.
 *    Checked by walking the installed module graph — verified against a build
 *    with `/RunPanel\.css$/` removed from `external`, which this file used to
 *    report as entirely `ok`.
 * 2. Every React entry carries `"use client"`. Both of them: the toolchain
 *    currently preserves the directive on its own, and `prependUseClient` only
 *    re-adds it to `./form/react`, so `./graph/react` is the entry standing on
 *    the bundler alone and is precisely the one worth asserting.
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
const unresolvedImports = [];

function externalsOf(entryFile, seen = new Set(), acc = new Set()) {
  const resolved = path.resolve(entryFile);
  if (seen.has(resolved)) return acc;
  if (!existsSync(resolved)) {
    // Recorded rather than skipped. A relative import pointing at a file the
    // tarball does not contain is the failure this script exists to catch, and
    // walking past it silently makes every check downstream pass VACUOUSLY —
    // the kernel-isolation walk reports "does not need the kernel" about a
    // module graph it could not finish reading.
    unresolvedImports.push(path.relative(repoRoot, resolved));
    return acc;
  }
  seen.add(resolved);
  const source = readFileSync(resolved, "utf8");
  // `\(?` is what admits `import("…")`. Without it the dynamic form is invisible
  // to this walk, and it is invisible to the eslint isolation rule too — base
  // `no-restricted-imports` does not visit `ImportExpression` — so the one
  // import spelling that escapes lint would also have escaped the packaging
  // check. Lazy-loading an optional peer is the obvious thing to reach for, not
  // an exotic one, which is what makes the shared blind spot worth closing.
  for (const match of source.matchAll(/(?:from|import)\s*\(?\s*["']([^"']+)["']/g)) {
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

  process.stdout.write("\nEvery React entry is a client module\n");
  for (const relative of ["dist/form/react/index.js", "dist/graph/react/index.js"]) {
    const entryPath = path.join(installed, relative);
    const source = existsSync(entryPath) ? readFileSync(entryPath, "utf8") : "";
    check(`${relative} starts with "use client"`, source.startsWith('"use client"'));
  }

  process.stdout.write("\nEvery exported stylesheet is reached by the JS that needs it\n");
  // One shared `seen` across every entry, which is the right shape for this
  // question — "does ANY entry import this file" — and the wrong shape for the
  // per-entry externals below, where a chunk already walked for an earlier
  // entry must still be walked for a later one.
  const reachedFiles = new Set();
  for (const target of Object.values(manifest.exports)) {
    if (typeof target === "string" || !target.import) continue;
    externalsOf(path.join(installed, target.import), reachedFiles);
  }
  for (const [subpath, target] of Object.entries(manifest.exports)) {
    if (typeof target !== "string" || !subpath.endsWith(".css")) continue;
    check(
      `${subpath} is imported by the built JS`,
      reachedFiles.has(path.resolve(path.join(installed, target))),
      "the file ships and the export resolves, but no entry imports it — tsup most likely bundled it into an unreferenced index.css because its specifier is missing from `external`",
    );
  }
  check(
    "every relative import in the installed package resolves to a file that ships",
    unresolvedImports.length === 0,
    unresolvedImports.join(", "),
  );

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
  // The form entry MUST import the kernel, as a BARE specifier. A bundled
  // copy would carry no such import while the entry still renders fields,
  // which is the failure this catches — and a bundled kernel means a second
  // React context identity, so the host's providers stop resolving inside our
  // component.
  //
  // This deliberately has no "the entry is empty" escape hatch. It had one
  // while the panel was still a stub, and leaving it in would have made the
  // assertion vacuous in precisely the regression it exists for: an entry
  // that built to nothing would satisfy the check rather than fail it.
  const formExternals = externalsPerEntry.get("./form/react") ?? [];
  check(
    "./form/react imports the kernel rather than inlining it",
    formExternals.some(isKernel),
    "the entry has no bare kernel import — it looks bundled, or it built to nothing",
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
