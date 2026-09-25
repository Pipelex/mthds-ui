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
 * The consumer DECLARES only this package and React. The kernel arrives anyway,
 * because it is a dependency — and that is the property worth testing from
 * outside, since a normal dev tree always has it as a devDependency and so can
 * never tell you whether a host would get it.
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
 *    report as entirely `ok`. The two stylesheets a HOST imports,
 *    `./tailwind.css` and `./form-kernel.css`, are the inverse case: no
 *    JavaScript in the package may import either, because injecting the form
 *    kernel's sheet into every host is what v0.20.0 through v0.24.0 did, and
 *    no cascade position for it served a host with Tailwind 4.
 * 2. Every React entry carries `"use client"`. Both of them: the toolchain
 *    currently preserves the directive on its own, and `prependUseClient` only
 *    re-adds it to `./form/react`, so `./graph/react` is the entry standing on
 *    the bundler alone and is precisely the one worth asserting.
 * 3. The kernel is left as a bare import, never inlined (design Decision B: a
 *    bundled copy is a second React context identity, so a host's
 *    `FieldStringsProvider` would not resolve inside the panel).
 * 4. The kernel is imported (never inlined) by the React entries, and absent
 *    from the React-free ones. Any other
 *    entry referencing it would break every graph-only consumer, who by
 *    construction has not installed it.
 * 5. A minimal Tailwind 4 host compiles every utility the kernel's controls
 *    need. Its stylesheet is the kernel's documented Tailwind 4 setup and
 *    nothing more — `tailwindcss`, `tw-animate-css`, the `.dark` class variant
 *    the kernel's dark mode follows, an `@theme inline` token mapping — with `@import "@pipelex/mthds-ui/tailwind.css"` in place of the
 *    setup's `@source` line. The oracle is the kernel's own prebuilt
 *    `styles.css`: every selector in its `utilities` layer must appear in the
 *    host's output. Finding one kernel class would prove only that the scan
 *    reached the package; the whole set proves the setup compiles what the
 *    kernel needs, semantic colours and animations included, and it follows the
 *    kernel from release to release with nothing written here but the named
 *    exceptions in `SOURCE_ONLY_KERNEL_SELECTORS`. It runs under each install
 *    layout `tailwind.css` has a path for: npm hoisting the kernel, npm nesting
 *    it under this package, and pnpm's virtual store, the layout the first
 *    candidate exists for — so `pnpm` must be on the path. Verified to fail
 *    with both `@source` paths in `src/styles/tailwind.css` broken (every
 *    kernel utility missing, under every layout), with only the nested path
 *    broken (the nested layout alone failing, so each candidate is the one its
 *    layout depends on), and with `tw-animate-css` dropped from the host (the
 *    enter and exit animation utilities missing, under every layout).
 *
 * Node cannot execute these entries directly (they import `.css`), so entry
 * loading is checked through `import.meta.resolve`, which walks the real export
 * map without evaluating the module.
 */
import { execFileSync } from "node:child_process";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  mkdtempSync,
  readFileSync,
  renameSync,
  rmSync,
  writeFileSync,
} from "node:fs";
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

/** The stylesheets a host imports itself. No JavaScript in the package imports them. */
const HOST_IMPORTED_STYLESHEETS = new Set(["./tailwind.css", "./form-kernel.css"]);

/** What a host with Tailwind 4 installs beside this package, per the kernel's documented setup. */
const TAILWIND_HOST_PACKAGES = [
  "tailwindcss@4",
  "@tailwindcss/postcss@4",
  "postcss",
  "tw-animate-css",
];

/**
 * Selectors the kernel's prebuilt sheet carries that no host scanning its
 * SHIPPED JavaScript can compile, each with the reason. The kernel builds its
 * sheet by scanning its source tree, comments and tests included, while a host
 * scans `dist`, where the comments are gone. A word in a comment that happens
 * to be a utility name therefore becomes a utility in the prebuilt sheet that no
 * control uses. An entry here is a difference that was investigated and found
 * to be exactly that; the comparison itself is never loosened, and an entry that
 * stops being a difference fails the run so the list cannot rot.
 */
const SOURCE_ONLY_KERNEL_SELECTORS = new Map([
  [
    ".contents",
    "`display: contents`, compiled from the word \"contents\" in comments in the kernel's " +
      "`src/react/result-field.tsx` and its tests; no shipped JavaScript contains the word",
  ],
  [
    ".static",
    "`position: static`, compiled from `static getDerivedStateFromError` in the kernel's " +
      "`src/react/__tests__/file-ways-in.test.tsx`, which its `@source` reaches; no shipped " +
      "JavaScript contains the word",
  ],
]);

/**
 * The minimal Tailwind 4 host, run inside the consumer so that it resolves
 * `postcss`, the Tailwind plugin and the packages under test exactly as a
 * host's build would. It writes the host stylesheet, compiles it and prints the
 * two selector sets as JSON; the comparison stays in this script.
 *
 * The kernel is located through THIS package, never from the consumer's root:
 * under pnpm the kernel is not linked at the root at all, and in every layout
 * the copy this package resolves is the one `tailwind.css` must find.
 *
 * The token mapping is derived from the names the kernel's shipped `theme.css`
 * defines on `:root`, so a token the kernel adds is mapped here without an
 * edit: every colour token becomes `--color-<name>`, and `--radius`, the one
 * geometry token, becomes the `lg`, `md` and `sm` radius keys the documented
 * setup names. The values are bare `var()`s, as a shadcn/ui host writes them.
 *
 * Minified on purpose: the kernel builds its sheet with `--minify`, which runs
 * Lightning CSS and flattens nesting, and an unminified host build keeps its
 * variants nested, so the two selector sets would differ in form alone.
 */
const TAILWIND_HOST_PROGRAM = String.raw`
import { createRequire } from "node:module";
import { readFileSync, realpathSync, writeFileSync } from "node:fs";
import path from "node:path";
import postcss from "postcss";
import tailwindcss from "@tailwindcss/postcss";

const consumer = process.cwd();
const ui = realpathSync(path.join(consumer, "node_modules", "@pipelex", "mthds-ui"));
const kernel = createRequire(path.join(ui, "package.json"));
const themeFile = kernel.resolve("@pipelex/mthds-form/theme.css");
const stylesFile = kernel.resolve("@pipelex/mthds-form/styles.css");

const tokens = [];
postcss.parse(readFileSync(themeFile, "utf8")).walkRules((rule) => {
  if (rule.selector !== ":root") return;
  rule.walkDecls((decl) => {
    if (decl.prop.startsWith("--")) tokens.push(decl.prop.slice(2));
  });
});
const mapping = tokens.flatMap((token) =>
  token === "radius"
    ? [
        "  --radius-lg: var(--radius);",
        "  --radius-md: calc(var(--radius) - 2px);",
        "  --radius-sm: calc(var(--radius) - 4px);",
      ]
    : ["  --color-" + token + ": var(--" + token + ");"],
);

const hostFile = path.join(consumer, "host.css");
const hostCss = [
  '@import "tailwindcss";',
  '@import "tw-animate-css";',
  '@import "@pipelex/mthds-ui/tailwind.css";',
  "",
  "@custom-variant dark (&:is(.dark *));",
  "",
  "@theme inline {",
  ...mapping,
  "}",
  "",
].join("\n");
writeFileSync(hostFile, hostCss);

const compiled = await postcss([
  tailwindcss({ base: consumer, optimize: { minify: true } }),
]).process(hostCss, { from: hostFile });

function utilitySelectors(css) {
  const selectors = new Set();
  postcss.parse(css).walkRules((rule) => {
    for (let parent = rule.parent; parent; parent = parent.parent) {
      const isUtilitiesLayer =
        parent.type === "atrule" && parent.name === "layer" && parent.params.trim() === "utilities";
      if (isUtilitiesLayer) {
        for (const selector of rule.selectors) selectors.add(selector.trim());
        return;
      }
    }
  });
  return [...selectors];
}

process.stdout.write(
  JSON.stringify({
    kernelSheet: path.relative(consumer, stylesFile),
    tokens,
    kernel: utilitySelectors(readFileSync(stylesFile, "utf8")),
    host: utilitySelectors(compiled.css),
  }),
);
`;

/** Compiles the minimal Tailwind 4 host in `consumer` and checks it against the kernel's sheet. */
function checkTailwindHost(consumer, layout) {
  writeFileSync(path.join(consumer, "tailwind-host.mjs"), TAILWIND_HOST_PROGRAM);
  let result;
  try {
    result = JSON.parse(run("node", ["tailwind-host.mjs"], consumer));
  } catch (error) {
    const detail = String(error.stderr ?? error.message).trim().split("\n").slice(0, 6);
    check(`${layout}: the host stylesheet compiles`, false, detail.join(" | "));
    return;
  }
  process.stdout.write(`  (the kernel's sheet is ${result.kernelSheet})\n`);

  // A check that compared nothing must fail rather than pass: an empty token
  // list or an empty oracle would make every comparison below vacuous.
  check(
    `${layout}: the token mapping was derived from the kernel's theme.css`,
    result.tokens.length > 0,
  );
  check(
    `${layout}: the kernel's sheet has a utilities layer to compare against`,
    result.kernel.length > 0,
  );

  const host = new Set(result.host);
  const kernel = new Set(result.kernel);
  const missing = result.kernel.filter(
    (selector) => !host.has(selector) && !SOURCE_ONLY_KERNEL_SELECTORS.has(selector),
  );
  const shown = missing.slice(0, 12).join("  ") + (missing.length > 12 ? "  …" : "");
  check(
    `${layout}: the kernel's ${kernel.size} utility selectors compile, named exceptions aside`,
    missing.length === 0,
    `${missing.length} missing: ${shown}`,
  );

  const stale = [...SOURCE_ONLY_KERNEL_SELECTORS.keys()].filter(
    (selector) => !kernel.has(selector) || host.has(selector),
  );
  check(
    `${layout}: every named exception is still a real difference`,
    stale.length === 0,
    `no longer a difference, remove from SOURCE_ONLY_KERNEL_SELECTORS: ${stale.join(", ")}`,
  );
}

/**
 * pnpm is a required gate, not an optional extra. Its virtual store is the
 * layout that leaves the kernel out of the consumer's root altogether, where a
 * host-written `@source` path into `node_modules` finds nothing, which is why
 * `tailwind.css` exists; no npm run reproduces it. Checked before anything is
 * packed, so a missing pnpm costs nothing.
 */
function requirePnpm() {
  try {
    run("pnpm", ["--version"], repoRoot);
  } catch {
    process.stdout.write(
      "pnpm is not on the path, and the Tailwind 4 host check must run under it.\n" +
        "Run `corepack enable` (it ships with Node) and try again.\n",
    );
    process.exit(1);
  }
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
  // check. A dynamic import of a peer is the obvious thing to reach for when
  // trimming a bundle, not an exotic one, which is what makes the blind spot
  // worth closing even now that the kernel is required everywhere React is.
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

requirePnpm();

const scratch = mkdtempSync(path.join(tmpdir(), "mthds-ui-smoke-"));
// A sibling, never a subdirectory of `scratch`: Node resolution walks up, so a
// pnpm consumer nested inside the npm one would silently fall back to npm's
// hoisted `node_modules` for anything pnpm's strict layout did not link.
const pnpmScratch = mkdtempSync(path.join(tmpdir(), "mthds-ui-smoke-pnpm-"));
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

  // This assertion has been inverted twice, and the history is the design.
  //
  // It first proved the kernel was ABSENT: it was an optional peer, isolated
  // behind `./form/react`, and a consumer that wanted the form had to declare
  // it. That was right while the kernel powered only the run form.
  //
  // It then proved the kernel ARRIVED as a required peer — which npm does and
  // pnpm, tested, does not: pnpm reports it unmet and installs nothing, even
  // with `auto-install-peers=true`. A property that holds on one package
  // manager is not a property a library can offer.
  //
  // So the kernel is a real DEPENDENCY, and this is what that buys: a host
  // installs THIS PACKAGE ALONE and gets a working form and a working detail
  // panel. The scratch consumer below declares nothing but this package and
  // React, which is the whole claim.
  process.stdout.write("\nThe kernel ships with the package\n");
  const kernelDir = path.join(scratch, "node_modules", "@pipelex", "mthds-form");
  check("@pipelex/mthds-form arrives without the consumer declaring it", existsSync(kernelDir));
  check(
    "it is a dependency, not a peer the host has to satisfy",
    manifest.dependencies?.["@pipelex/mthds-form"] !== undefined &&
      manifest.peerDependencies?.["@pipelex/mthds-form"] === undefined,
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
  const bareSpecifiers = new Set();
  for (const target of Object.values(manifest.exports)) {
    if (typeof target === "string" || !target.import) continue;
    externalsOf(path.join(installed, target.import), reachedFiles, bareSpecifiers);
  }
  for (const [subpath, target] of Object.entries(manifest.exports)) {
    if (typeof target !== "string" || !subpath.endsWith(".css")) continue;
    if (HOST_IMPORTED_STYLESHEETS.has(subpath)) continue;
    check(
      `${subpath} is imported by the built JS`,
      reachedFiles.has(path.resolve(path.join(installed, target))),
      "the file ships and the export resolves, but no entry imports it — tsup most likely bundled it into an unreferenced index.css because its specifier is missing from `external`",
    );
  }

  process.stdout.write("\nThe host stylesheets are the host's to import, never the package's\n");
  for (const subpath of HOST_IMPORTED_STYLESHEETS) {
    const target = manifest.exports[subpath];
    check(`${subpath} is exported`, typeof target === "string");
    if (typeof target !== "string") continue;
    const bySelfReference = path.posix.join("@pipelex/mthds-ui", subpath);
    check(
      `no JavaScript in the package imports ${subpath}`,
      !reachedFiles.has(path.resolve(path.join(installed, target))) &&
        !bareSpecifiers.has(bySelfReference),
      "an entry imports it, which injects the form kernel's sheet into every host",
    );
  }
  const kernelSheetImports = [...bareSpecifiers].filter(
    (specifier) => specifier.startsWith("@pipelex/mthds-form/") && specifier.endsWith(".css"),
  );
  check(
    "no JavaScript in the package imports a kernel stylesheet directly",
    kernelSheetImports.length === 0,
    kernelSheetImports.join(", "),
  );
  check(
    "every relative import in the installed package resolves to a file that ships",
    unresolvedImports.length === 0,
    unresolvedImports.join(", "),
  );

  process.stdout.write("\nThe kernel is imported, never inlined\n");
  const isKernel = (specifier) =>
    specifier.split("/").slice(0, 2).join("/") === "@pipelex/mthds-form";
  const externalsPerEntry = new Map();
  for (const [subpath, target] of Object.entries(manifest.exports)) {
    if (typeof target === "string" || !target.import) continue;
    externalsPerEntry.set(subpath, [...externalsOf(path.join(installed, target.import))]);
  }

  // The React entries that RENDER fields or results must import the kernel, as
  // a BARE specifier. A bundled copy carries no such import while the entry
  // still renders — which is the failure this catches, and it is not cosmetic:
  // a bundled kernel is a second React context identity, so a host's providers
  // stop resolving inside our components.
  //
  // This deliberately has no "the entry is empty" escape hatch. It had one while
  // the panel was still a stub, and leaving it in would make the assertion
  // vacuous in precisely the regression it exists for: an entry that built to
  // nothing would satisfy the check rather than fail it.
  for (const subpath of ["./form/react", "./graph/react"]) {
    const externals = externalsPerEntry.get(subpath) ?? [];
    check(
      `${subpath} imports the kernel rather than inlining it`,
      externals.some(isKernel),
      "the entry has no bare kernel import — it looks bundled, or it built to nothing",
    );
  }

  // The React-FREE entries must still resolve without it. That is what is left
  // of the old isolation rule, and it is the half that still matters: `.` and
  // `./graph` and `./static-graph` are importable from a CLI or a worker with no
  // React and no kernel installed, and a stray value import from a pure module
  // would take that away silently.
  for (const subpath of [".", "./graph", "./static-graph"]) {
    const kernelImports = (externalsPerEntry.get(subpath) ?? []).filter(isKernel);
    check(
      `${subpath} does not need the kernel`,
      kernelImports.length === 0,
      kernelImports.join(", "),
    );
  }

  // ONE copy of the kernel, and this is the assertion the dependency choice
  // rests on. Two copies means two React context identities, so a host's
  // `FieldStringsProvider` silently fails to resolve inside our controls — the
  // failure the peer arrangement used to prevent structurally. A host that
  // declares nothing cannot produce a second copy; this checks that the
  // published tree does not either.
  const kernelCopies = [];
  const walk = (dir, depth) => {
    if (depth > 6 || !existsSync(dir)) return;
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (!entry.isDirectory()) continue;
      const child = path.join(dir, entry.name);
      if (entry.name === "mthds-form" && path.basename(dir) === "@pipelex") kernelCopies.push(child);
      else walk(child, depth + 1);
    }
  };
  walk(path.join(scratch, "node_modules"), 0);
  check(
    "exactly one copy of the kernel in the consumer's tree",
    kernelCopies.length === 1,
    `${kernelCopies.length} copies: ${kernelCopies.map((c) => path.relative(scratch, c)).join(", ")}`,
  );

  // The Tailwind packages go in only now, after the checks above that rest on
  // the consumer declaring nothing but this package and React.
  process.stdout.write("\nA Tailwind 4 host compiles the kernel's classes: npm, kernel hoisted\n");
  run("npm", ["install", "--no-audit", "--no-fund", ...TAILWIND_HOST_PACKAGES], scratch);
  checkTailwindHost(scratch, "npm, hoisted");

  // npm nests the kernel under this package when the host's tree already holds
  // another version at the top. Reproduced by moving the hoisted copy, which is
  // exactly the tree npm would build, so the second `@source` candidate is the
  // only one that can find it.
  process.stdout.write("\nA Tailwind 4 host compiles the kernel's classes: npm, kernel nested\n");
  const nestedKernelDir = path.join(installed, "node_modules", "@pipelex", "mthds-form");
  mkdirSync(path.dirname(nestedKernelDir), { recursive: true });
  renameSync(kernelDir, nestedKernelDir);
  checkTailwindHost(scratch, "npm, nested");

  process.stdout.write("\nA Tailwind 4 host compiles the kernel's classes: pnpm virtual store\n");
  run("npm", ["init", "-y"], pnpmScratch);
  run("npm", ["pkg", "set", "type=module"], pnpmScratch);
  run("pnpm", ["add", tarball, "react", "react-dom", ...TAILWIND_HOST_PACKAGES], pnpmScratch);
  check(
    "pnpm links the kernel beside this package, not at the consumer's root",
    !existsSync(path.join(pnpmScratch, "node_modules", "@pipelex", "mthds-form")),
    "the kernel is at the root, so this run does not exercise the virtual-store layout",
  );
  checkTailwindHost(pnpmScratch, "pnpm");
} finally {
  rmSync(scratch, { recursive: true, force: true });
  rmSync(pnpmScratch, { recursive: true, force: true });
}

if (failures.length > 0) {
  process.stdout.write(`\n${failures.length} packaging check(s) failed.\n`);
  process.exit(1);
}
process.stdout.write("\nPackaging smoke test passed.\n");
