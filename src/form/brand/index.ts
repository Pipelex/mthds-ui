/**
 * The `./form/brand` entry — the form kernel's `./brand` entry, re-exported.
 *
 * A host that brands its pages reaches the kernel's colour derivation here:
 * `deriveBrandRoles` turns up to three seed colours a person picked into the
 * roles a page paints with, every text role readable at WCAG AA, and returns
 * only the roles a set colour produces, so a host keeps its own token wherever
 * the team set nothing. `resolveDarkSeeds`, `isActionFaint`, `isAccentAdjusted`
 * and `readableTextOn` are the rules around it. The same entry carries the rest
 * of the kernel's brand surface: the theme contract, the token file's
 * validator, and the manifest, provenance and compiler a full brand goes
 * through.
 *
 * It is its own entry rather than part of `./form` because the kernel keeps it
 * apart from its `.` entry, and for the same reason: it is isomorphic and
 * network-free, with no React and no DOM, so a settings screen, a server action
 * and a build script all import it. Re-exported wholesale, it follows the
 * kernel from release to release with nothing to edit here.
 *
 * The rule `./form` states holds here too: a host imports the kernel through
 * this package, never directly, so its tree holds one copy of it.
 *
 * Mapping the roles onto the tokens the kernel's controls read — `--primary`,
 * `--primary-foreground`, `--link`, `--selected` and `--ring` — is described in
 * `docs/run-form-panel.md`.
 */

export * from "@pipelex/mthds-form/brand";
