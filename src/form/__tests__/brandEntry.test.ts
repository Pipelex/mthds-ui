/**
 * What the `./form/brand` entry carries of the kernel's `./brand` entry.
 *
 * The entry re-exports the kernel's brand surface wholesale, so a host reaches
 * the seed colour derivation through this package and never names the kernel
 * itself. These assertions notice an entry that stops carrying it: a re-export
 * narrowed to a list, a copy of the kernel's functions rather than the kernel's
 * own, or a kernel range from before the derivation stopped falling back to a
 * colour nobody set. The derivation's guarantees are the kernel's and are
 * tested there across a sweep of seeds; here one seed goes through each
 * function, to show the entry is wired to code that works rather than to names
 * that resolve.
 */
import { describe, expect, expectTypeOf, it } from "vitest";
import * as kernelBrand from "@pipelex/mthds-form/brand";
import type {
  BrandRoles as KernelBrandRoles,
  BrandSeeds as KernelBrandSeeds,
  TextOnFill as KernelTextOnFill,
} from "@pipelex/mthds-form/brand";
import * as brand from "@form/brand/index";
import {
  contrastRatio,
  deriveBrandRoles,
  isAccentAdjusted,
  isActionFaint,
  readableTextOn,
  resolveDarkSeeds,
  type BrandRoles,
  type BrandSeeds,
  type SrgbColor,
  type TextOnFill,
} from "@form/brand/index";

const LIGHT_PAGE = "#ffffff";
const DARK_PAGE = "#0d0d0d";

/** A pale yellow: a good button fill, a faint control on white, unreadable as text there. */
const PALE_YELLOW = "#FACC15";

/** A navy, for a header band that wants white text. */
const NAVY = "#1e3a8a";

function srgb(hex: string): SrgbColor {
  const channel = (offset: number) => parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return { colorSpace: "srgb", components: [channel(1), channel(3), channel(5)], alpha: 1 };
}

function contrast(a: string, b: string): number {
  return contrastRatio(srgb(a), srgb(b));
}

/**
 * A host's mapping of the roles onto the tokens the kernel's controls read, as
 * `docs/run-form-panel.md` writes it: a token is written only when its role is
 * present, so the host keeps its own value wherever the team set nothing.
 * Checking one role of a group narrows the rest of it, which is what lets this
 * compile without a cast.
 */
function brandTokens(roles: BrandRoles): Record<string, string> {
  const tokens: Record<string, string> = {};
  if (roles.action !== undefined) {
    tokens["--primary"] = roles.action;
    tokens["--primary-foreground"] = roles.onAction;
  }
  if (roles.accentInk !== undefined) {
    tokens["--link"] = roles.accentInk;
    tokens["--ring"] = roles.accentInk;
    tokens["--selected"] = roles.accentFill;
  }
  return tokens;
}

describe("the ./form/brand entry", () => {
  it("re-exports the kernel's brand entry wholesale", () => {
    expect(Object.keys(brand).sort()).toEqual(Object.keys(kernelBrand).sort());
  });

  it("re-exports the kernel's own functions, not copies of them", () => {
    expect(brand.deriveBrandRoles).toBe(kernelBrand.deriveBrandRoles);
    expect(brand.resolveDarkSeeds).toBe(kernelBrand.resolveDarkSeeds);
    expect(brand.isActionFaint).toBe(kernelBrand.isActionFaint);
    expect(brand.isAccentAdjusted).toBe(kernelBrand.isAccentAdjusted);
    expect(brand.readableTextOn).toBe(kernelBrand.readableTextOn);
  });

  it("carries no fallback colour: an unset button colour is the host's, not a green", () => {
    expect(Object.keys(brand)).not.toContain("PIPELEX_GREEN");
  });

  it("carries the derivation's types, the same ones the kernel declares", () => {
    expectTypeOf<BrandSeeds>().toEqualTypeOf<KernelBrandSeeds>();
    expectTypeOf<BrandRoles>().toEqualTypeOf<KernelBrandRoles>();
    expectTypeOf<TextOnFill>().toEqualTypeOf<KernelTextOnFill>();
    expectTypeOf(deriveBrandRoles).returns.toEqualTypeOf<BrandRoles>();
    expectTypeOf(resolveDarkSeeds).returns.toEqualTypeOf<BrandSeeds>();
  });
});

describe("one seed through the entry", () => {
  it("derives readable roles from a pale button colour on a light page", () => {
    const roles = deriveBrandRoles({ action: PALE_YELLOW }, LIGHT_PAGE);

    // The fills are the seed as set, in lower case, and the unset accent
    // follows the button colour.
    expect(roles.action).toBe("#facc15");
    expect(roles.accent).toBe("#facc15");

    // Text on the button is black or white, by the rule `readableTextOn` states.
    expect(roles.onAction).toBe(readableTextOn(PALE_YELLOW));
    expect(roles.onAction).toBe("#000000");

    // The yellow does not read as text on white, so the ink is darkened until
    // it reads on the page and on the pale fill.
    if (roles.accentInk === undefined) throw new Error("the accent's roles are absent");
    expect(roles.accentInk).not.toBe(roles.accent);
    expect(contrast(roles.accentInk, LIGHT_PAGE)).toBeGreaterThanOrEqual(4.5);
    expect(contrast(roles.accentInk, roles.accentFill)).toBeGreaterThanOrEqual(4.5);
  });

  it("warns about it as a settings screen would, per theme", () => {
    const seeds = { action: PALE_YELLOW };
    expect(isActionFaint(seeds, LIGHT_PAGE)).toBe(true);
    expect(isAccentAdjusted(seeds, LIGHT_PAGE)).toBe(true);

    const darkSeeds = resolveDarkSeeds(seeds, null);
    expect(darkSeeds).toEqual({ action: PALE_YELLOW, accent: null, header: null });
    expect(isActionFaint(darkSeeds, DARK_PAGE)).toBe(false);
    const dark = deriveBrandRoles(darkSeeds, DARK_PAGE);
    if (dark.accentInk === undefined) throw new Error("the accent's roles are absent");
    expect(isAccentAdjusted(darkSeeds, DARK_PAGE)).toBe(dark.accentInk !== dark.accent);
    expect(contrast(dark.accentInk, DARK_PAGE)).toBeGreaterThanOrEqual(4.5);
  });
});

describe("a role the team left unset comes back absent", () => {
  it("returns no role at all when no seed is set, and warns about nothing", () => {
    expect(deriveBrandRoles({}, LIGHT_PAGE)).toEqual({});
    expect(deriveBrandRoles(null, DARK_PAGE)).toEqual({});
    expect(isActionFaint({}, LIGHT_PAGE)).toBe(false);
    expect(isAccentAdjusted({}, LIGHT_PAGE)).toBe(false);
  });

  it("leaves the header's pair out when only a button colour is set", () => {
    const roles = deriveBrandRoles({ action: PALE_YELLOW }, LIGHT_PAGE);
    expect(Object.keys(roles).sort()).toEqual(
      ["accent", "accentFill", "accentInk", "action", "onAction"].sort(),
    );
  });

  it("returns the header's pair alone when only a header is set", () => {
    const roles = deriveBrandRoles({ header: NAVY }, LIGHT_PAGE);
    expect(roles).toEqual({ header: NAVY, onHeader: "#ffffff" });
  });

  it("so a host's mapping writes no token for a role the team left unset", () => {
    // No seed: every token stays the host's own.
    expect(brandTokens(deriveBrandRoles({}, LIGHT_PAGE))).toEqual({});
    // A header alone paints the host's band, which the controls do not draw.
    expect(brandTokens(deriveBrandRoles({ header: NAVY }, LIGHT_PAGE))).toEqual({});
    // An accent alone brings the accent's tokens and leaves the button the host's.
    const accentOnly = brandTokens(deriveBrandRoles({ accent: NAVY }, LIGHT_PAGE));
    expect(Object.keys(accentOnly).sort()).toEqual(["--link", "--ring", "--selected"]);
    // A button colour brings the action pair and, through the accent it sets, the rest.
    const actionSet = brandTokens(deriveBrandRoles({ action: PALE_YELLOW }, LIGHT_PAGE));
    expect(Object.keys(actionSet).sort()).toEqual(
      ["--link", "--primary", "--primary-foreground", "--ring", "--selected"].sort(),
    );
    expect(actionSet["--link"]).toBe(actionSet["--ring"]);
  });
});
