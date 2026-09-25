/**
 * Guards for the two stylesheets a HOST imports to style the form kernel's
 * controls, and for the rule that this package's JavaScript imports neither.
 *
 * From v0.20.0 through v0.24.0 both React entries injected the kernel's
 * prebuilt sheet into every host, first raw and then under a cascade layer. The
 * sheet is a complete Tailwind build, preflight and utilities together, and no
 * single cascade position serves a host that has Tailwind 4: appended, the
 * layer outranked every responsive variant the host wrote; named first, the
 * host's preflight stripped the kernel's utilities. In a host without Tailwind
 * the preflight reset the page's browser defaults the moment a graph mounted.
 * So the injection was removed, and each kind of host loads what it needs:
 *
 *   - a host with Tailwind 4 imports `@pipelex/mthds-ui/tailwind.css`, which
 *     holds only the `@source` directives that find the kernel's shipped
 *     JavaScript, and compiles the kernel's classes itself;
 *   - a host without Tailwind imports `@pipelex/mthds-ui/form-kernel.css`, the
 *     kernel's sheet under a layer.
 *
 * The first block below keeps the injection from coming back by accident. The
 * others hold the shape of each host stylesheet, which is the part a future
 * edit can quietly undo. Whether the documented Tailwind 4 setup really
 * compiles every class the kernel needs is `make smoke-pack`'s question: it
 * compiles a minimal host against the packed tarball under npm and pnpm.
 */
import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const STYLES_DIR = path.join(REPO_ROOT, "src", "styles") + path.sep;

function read(rel: string): string {
  return readFileSync(path.join(REPO_ROOT, rel), "utf-8");
}

function stripCssComments(css: string): string {
  return css.replace(/\/\*[\s\S]*?\*\//g, "");
}

/** The React entries, which render the kernel's controls and used to inject its sheet. */
const REACT_ENTRIES = ["src/graph/react/index.ts", "src/form/react/index.ts"];

/** Every `.ts`/`.tsx` under `src/` that ships, which is where an import could return. */
function shippedSourceFiles(dir = path.join(REPO_ROOT, "src")): string[] {
  const out: string[] = [];
  for (const entry of readdirSync(dir)) {
    if (entry === "__tests__" || entry === "__stories__") continue;
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) out.push(...shippedSourceFiles(full));
    else if (/\.tsx?$/.test(entry)) out.push(full);
  }
  return out;
}

/**
 * The kernel stylesheets `source` imports, static or dynamic: any `.css` under
 * the kernel's package name, and any relative import that lands in
 * `src/styles/`, where the host stylesheets live. Comments are not imports, so a
 * block comment recalling the old import does not count.
 */
function kernelStylesheetImports(importer: string, source: string): string[] {
  const code = source.replace(/\/\*[\s\S]*?\*\//g, "").replace(/^\s*\/\/.*$/gm, "");
  const found: string[] = [];
  for (const match of code.matchAll(/import\s*\(?\s*["']([^"']+\.css)["']/g)) {
    const specifier = match[1];
    const isKernelPackageSheet = specifier.startsWith("@pipelex/mthds-form/");
    const isHostSheet =
      specifier.startsWith(".") &&
      path.resolve(path.dirname(importer), specifier).startsWith(STYLES_DIR);
    if (isKernelPackageSheet || isHostSheet) found.push(specifier);
  }
  return found;
}

describe("no JavaScript in the package imports a kernel stylesheet", () => {
  it.each(REACT_ENTRIES)("%s imports none", (entry) => {
    const file = path.join(REPO_ROOT, entry);
    expect(kernelStylesheetImports(file, readFileSync(file, "utf-8"))).toEqual([]);
  });

  it("no shipped source file imports one either", () => {
    const files = shippedSourceFiles();
    // The walk reached the React entries, so an empty result means something.
    for (const entry of REACT_ENTRIES) expect(files).toContain(path.join(REPO_ROOT, entry));

    const offenders = files.flatMap((file) =>
      kernelStylesheetImports(file, readFileSync(file, "utf-8")).map(
        (specifier) => `${path.relative(REPO_ROOT, file)} imports ${specifier}`,
      ),
    );
    expect(
      offenders,
      'A kernel stylesheet is the host\'s to load (README, "Styling the form controls"); injecting it from JavaScript is the defect this package removed.',
    ).toEqual([]);
  });

  it("recognises an import when there is one", () => {
    // The detector's own teeth: a pattern that silently matched nothing would
    // make both tests above pass vacuously.
    const importer = path.join(REPO_ROOT, "src/graph/react/index.ts");
    const detect = (source: string) => kernelStylesheetImports(importer, source);
    expect(detect('import "../../styles/form-kernel.css";')).toHaveLength(1);
    expect(detect('import "@pipelex/mthds-form/styles.css";')).toHaveLength(1);
    expect(detect('await import("../../styles/tailwind.css");')).toHaveLength(1);
    expect(detect('import "./graph-core.css";')).toHaveLength(0);
    expect(detect('// import "../../styles/form-kernel.css";')).toHaveLength(0);
  });
});

describe("form-kernel.css, for a host without Tailwind", () => {
  it("imports the kernel's sheet under a cascade layer", () => {
    expect(read("src/styles/form-kernel.css")).toContain(
      '@import "@pipelex/mthds-form/styles.css" layer(mthds-form);',
    );
  });

  it("does not import theme.css, which would repaint the host's tokens", () => {
    expect(read("src/styles/form-kernel.css")).not.toContain('theme.css"');
  });
});

describe("tailwind.css, for a host with Tailwind 4", () => {
  const SIBLING = "../../../mthds-form/dist";
  const NESTED = "../../node_modules/@pipelex/mthds-form/dist";

  it("holds the two @source candidates and nothing else", () => {
    const statements = stripCssComments(read("src/styles/tailwind.css"))
      .split(";")
      .map((statement) => statement.trim())
      .filter(Boolean);
    // Nothing else, and in particular no `@theme`: the token mapping is the
    // host's design system, and a theme block arriving from a package is the
    // kind of cross-package override this arrangement exists to remove.
    expect(statements).toEqual([`@source "${SIBLING}"`, `@source "${NESTED}"`]);
  });

  /**
   * Tailwind resolves an imported package stylesheet to its real path, then
   * resolves that file's `@source` directives relative to it. So each candidate
   * is checked from where the file really lands in the layout it serves.
   */
  const LAYOUTS = [
    {
      name: "a pnpm virtual store, where the kernel is linked beside this package",
      stylesDir:
        "node_modules/.pnpm/@pipelex+mthds-ui@1.0.0/node_modules/@pipelex/mthds-ui/dist/styles",
      kernelDist:
        "node_modules/.pnpm/@pipelex+mthds-ui@1.0.0/node_modules/@pipelex/mthds-form/dist",
      candidate: SIBLING,
    },
    {
      name: "an npm tree that hoisted the kernel",
      stylesDir: "node_modules/@pipelex/mthds-ui/dist/styles",
      kernelDist: "node_modules/@pipelex/mthds-form/dist",
      candidate: SIBLING,
    },
    {
      name: "an npm tree that nested the kernel under this package",
      stylesDir: "node_modules/@pipelex/mthds-ui/dist/styles",
      kernelDist: "node_modules/@pipelex/mthds-ui/node_modules/@pipelex/mthds-form/dist",
      candidate: NESTED,
    },
  ];

  it.each(LAYOUTS)("finds the kernel's dist in $name", ({ stylesDir, kernelDist, candidate }) => {
    const host = "/host";
    expect(path.posix.resolve(host, stylesDir, candidate)).toBe(path.posix.join(host, kernelDist));
  });

  it("ships to dist/styles/, where its @source paths assume it lands", () => {
    expect(read("tsup.config.ts")).toContain(
      'cpSync("src/styles/tailwind.css", "dist/styles/tailwind.css")',
    );
    const manifest = JSON.parse(read("package.json")) as { exports: Record<string, unknown> };
    expect(manifest.exports["./tailwind.css"]).toBe("./dist/styles/tailwind.css");
    expect(manifest.exports["./form-kernel.css"]).toBe("./dist/styles/form-kernel.css");
  });
});
