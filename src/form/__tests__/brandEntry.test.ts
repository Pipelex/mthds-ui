/**
 * What the `./form/brand` entry carries of the kernel's `./brand` entry.
 *
 * The entry re-exports the kernel's brand surface wholesale, so a host reaches
 * the seed colour derivation through this package and never names the kernel
 * itself. These assertions notice an entry that stops carrying it: a re-export
 * narrowed to a list, a copy of the kernel's functions rather than the kernel's
 * own, or a kernel range from before the derivation existed. The derivation's
 * guarantees are the kernel's and are tested there across a sweep of seeds;
 * here one seed goes through each function, to show the entry is wired to code
 * that works rather than to names that resolve.
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
  PIPELEX_GREEN,
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

function srgb(hex: string): SrgbColor {
  const channel = (offset: number) => parseInt(hex.slice(offset, offset + 2), 16) / 255;
  return { colorSpace: "srgb", components: [channel(1), channel(3), channel(5)], alpha: 1 };
}

function contrast(a: string, b: string): number {
  return contrastRatio(srgb(a), srgb(b));
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
    expect(brand.PIPELEX_GREEN).toBe(kernelBrand.PIPELEX_GREEN);
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

    // The fills are the seed as set, in lower case; the accent follows the
    // button colour and the unset header is the page.
    expect(roles.action).toBe("#facc15");
    expect(roles.accent).toBe("#facc15");
    expect(roles.header).toBe(LIGHT_PAGE);

    // Text on the button is black or white, by the rule `readableTextOn` states.
    expect(roles.onAction).toBe(readableTextOn(PALE_YELLOW));
    expect(roles.onAction).toBe("#000000");

    // The yellow does not read as text on white, so the ink is darkened until
    // it reads on the page and on the pale fill.
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
    expect(isAccentAdjusted(darkSeeds, DARK_PAGE)).toBe(dark.accentInk !== dark.accent);
    expect(contrast(dark.accentInk, DARK_PAGE)).toBeGreaterThanOrEqual(4.5);
  });

  it("falls back to Pipelex green when no seed is set, and warns about nothing", () => {
    const roles = deriveBrandRoles({}, LIGHT_PAGE);
    expect(roles.action).toBe(PIPELEX_GREEN);
    expect(roles.accent).toBe(PIPELEX_GREEN);
    expect(roles.header).toBe(LIGHT_PAGE);
    expect(isActionFaint({}, LIGHT_PAGE)).toBe(false);
    expect(isAccentAdjusted({}, LIGHT_PAGE)).toBe(false);
  });
});
