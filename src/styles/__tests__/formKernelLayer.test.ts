/**
 * Regression guard for the defect that shipped in v0.20.0.
 *
 * That release added `import "@pipelex/mthds-form/styles.css"` to the graph and
 * form React entries so a Tailwind host would stop silently missing the
 * kernel's classes. The import was right; injecting that sheet RAW was not.
 * It is a complete Tailwind build — preflight, plus every utility unprefixed
 * and unscoped — and it is code-split, so it lands in the host's `<head>` after
 * the host's own stylesheet the moment a graph mounts. From that instant it won
 * every tie it had no business winning:
 *
 *   - its bare `.hidden { display: none }` beat the host's `.sm\:inline`, so
 *     every `class="hidden sm:inline"` label in `pipelex-app` vanished at every
 *     width (toolbar buttons, deploy dialog tabs, responsive separators);
 *   - its preflight `*, ::before, ::after { border: 0 solid #e5e7eb }` replaced
 *     the host's default border color, painting a pale hairline under anything
 *     with a border width and no explicit color class.
 *
 * The fix is the cascade layer in `../form-kernel.css`: layered rules lose to
 * unlayered ones whatever the source order, so the host keeps what it declares
 * and we still supply the classes it never generated.
 *
 * These assertions are about the SHAPE of the wrapper, which is the part a
 * future edit can quietly undo — reinstating a direct import, or dropping the
 * `layer()` while keeping the file.
 */
import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");

function read(rel: string): string {
  return readFileSync(path.join(REPO_ROOT, rel), "utf-8");
}

/** Every entry that pulls the kernel's utilities in. */
const ENTRIES = ["src/graph/react/index.ts", "src/form/react/index.ts"];

describe("form kernel stylesheet wrapper", () => {
  it("imports the kernel's sheet under a cascade layer", () => {
    expect(read("src/styles/form-kernel.css")).toContain(
      '@import "@pipelex/mthds-form/styles.css" layer(mthds-form);',
    );
  });

  it("does not import theme.css, which would repaint the host's tokens", () => {
    expect(read("src/styles/form-kernel.css")).not.toContain('theme.css"');
  });

  it.each(ENTRIES)("%s reaches the kernel's CSS only through the wrapper", (entry) => {
    const source = read(entry);
    // The raw specifier is what v0.20.0 shipped. Reintroducing it anywhere
    // outside a comment puts the unlayered sheet back in the host's head.
    const rawImport = /^\s*import\s+["']@pipelex\/mthds-form\/styles\.css["']/m;
    expect(rawImport.test(source)).toBe(false);
    expect(source).toContain('import "../../styles/form-kernel.css";');
  });
});
