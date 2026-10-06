import { describe, expect, it } from "vitest";

import type { ConceptInfo, StuffMultiplicity } from "@graph/types";

import { deriveBinding } from "../bindingWalk";
import { nativeConceptInfo } from "../conceptRefs";
import { mergeBundles } from "../mergeBundles";
import { parseMthdsBundle } from "../parseMthdsBundle";
import type { MergedMethodSet } from "../types";

/** Concepts every test walks: one of each field type the walk reads. */
const SHOP = `
domain = "shop"

[concept.Address]
description = "Where a parcel goes"
[concept.Address.structure]
city = { type = "text", description = "The city", required = true }

[concept.Line]
description = "One line of an order"
[concept.Line.structure]
sku = { type = "text", description = "The product code", required = true }
quantity = { type = "integer", description = "How many", required = true }

[concept.Order]
description = "An order"
[concept.Order.structure]
reference = "The order reference"
status = { choices = ["open", "closed"], description = "Where the order stands" }
total = { type = "number", description = "The total" }
paid = { type = "boolean", description = "Whether it is paid" }
placed_on = { type = "date", description = "The day it was placed" }
placed_at = { type = "datetime", description = "The moment it was placed" }
cutoff = { type = "time", description = "The dispatch cutoff" }
extras = { type = "dict", description = "Anything else" }
address = { type = "concept", concept_ref = "Address", description = "Where it goes" }
lines = { type = "list", item_type = "concept", item_concept_ref = "Line", description = "The lines" }
tags = { type = "list", item_type = "text", description = "Free tags" }
loose = { type = "list", description = "A list with no item type" }
scan = { type = "concept", concept_ref = "Image", description = "A scan of the order" }
attachment = { type = "concept", concept_ref = "native.Anything", description = "Anything attached" }
vendor = { type = "concept", concept_ref = "suppliers.Vendor", description = "Who sells it" }
mood = { type = "concept", concept_ref = "Choice", description = "How the buyer felt" }
external = { type = "concept", concept_ref = "lib->shared.Thing", description = "From a dependency" }
weird = { type = "colour", description = "A type the standard lacks" }

[concept.Note]
description = "A note, with no structure"

[concept.Legacy]
description = "A concept whose structure is a Python class"
structure = "LegacyContent"

[concept.PriorityOrder]
description = "An order refined"
refines = "Order"

[concept.Remark]
description = "A text refined"
refines = "Text"

[concept.Loop]
description = "Refines itself"
refines = "Loop"
`;

const SUPPLIERS = `
domain = "suppliers"

[concept.Vendor]
description = "A vendor"
[concept.Vendor.structure]
name = { type = "text", description = "The name", required = true }
`;

function methodSet(): MergedMethodSet {
  return mergeBundles([parseMthdsBundle(SHOP).bundle, parseMthdsBundle(SUPPLIERS).bundle]);
}

function concept(set: MergedMethodSet, domain: string, code: string): ConceptInfo {
  return set.domains[domain].concepts[code];
}

function derive(path: string, root: ConceptInfo, multiplicity: StuffMultiplicity = null) {
  return deriveBinding(methodSet(), path, { concept: root, multiplicity });
}

function derivedRef(path: string, root: ConceptInfo, multiplicity: StuffMultiplicity = null) {
  const derivation = derive(path, root, multiplicity);
  if (derivation.kind !== "derived") throw new Error(derivation.reason);
  return {
    ref: `${derivation.concept.domain_code}.${derivation.concept.code}`,
    multiplicity: derivation.multiplicity,
  };
}

function unresolvedReason(path: string, root: ConceptInfo): string {
  const derivation = derive(path, root);
  if (derivation.kind !== "unresolved") throw new Error(`"${path}" derived, expected a failure`);
  return derivation.reason;
}

const order = () => concept(methodSet(), "shop", "Order");

describe("deriveBinding — a bare name", () => {
  it("keeps its root's concept and multiplicity", () => {
    expect(derivedRef("order", order())).toEqual({ ref: "shop.Order", multiplicity: null });
    expect(derivedRef("orders", order(), true)).toEqual({ ref: "shop.Order", multiplicity: true });
    expect(derivedRef("orders", order(), 3)).toEqual({ ref: "shop.Order", multiplicity: 3 });
  });
});

describe("deriveBinding — the field types", () => {
  it.each([
    ["order.reference", "native.Text"],
    ["order.status", "native.Text"],
    ["order.total", "native.Number"],
    ["order.paid", "native.YesNo"],
    ["order.placed_on", "native.Date"],
    ["order.placed_at", "native.Date"],
    ["order.cutoff", "native.Time"],
    ["order.extras", "native.JSON"],
    ["order.address", "shop.Address"],
    ["order.address.city", "native.Text"],
    ["order.scan", "native.Image"],
    ["order.attachment", "native.Anything"],
  ])("binds %s as a single %s", (path, ref) => {
    expect(derivedRef(path, order())).toEqual({ ref, multiplicity: null });
  });

  it("crosses a list of concepts, and makes every later leaf a list", () => {
    expect(derivedRef("order.lines", order())).toEqual({ ref: "shop.Line", multiplicity: true });
    expect(derivedRef("order.lines.quantity", order())).toEqual({
      ref: "native.Number",
      multiplicity: true,
    });
  });

  it("binds a list of scalars as a list of their native", () => {
    expect(derivedRef("order.tags", order())).toEqual({ ref: "native.Text", multiplicity: true });
  });

  it("makes a field of a plural root a list", () => {
    expect(derivedRef("orders.total", order(), true)).toEqual({
      ref: "native.Number",
      multiplicity: true,
    });
  });

  it("follows a concept ref into another domain of the method", () => {
    expect(derivedRef("order.vendor", order())).toEqual({
      ref: "suppliers.Vendor",
      multiplicity: null,
    });
    expect(derivedRef("order.vendor.name", order())).toEqual({
      ref: "native.Text",
      multiplicity: null,
    });
  });

  it("names a native the static catalog lacks in the native domain all the same", () => {
    const derivation = derive("order.mood", order());
    expect(derivation).toMatchObject({
      kind: "derived",
      concept: { code: "Choice", domain_code: "native" },
    });
  });
});

describe("deriveBinding — natives, walked through their pinned definitions", () => {
  it.each([
    ["Page", "page.page_view", "native.Image", null],
    ["Page", "page.text_and_images.images", "native.Image", true],
    ["Page", "page.text_and_images.text", "native.Text", null],
    ["Image", "image.width", "native.Number", null],
    ["Image", "image.caption", "native.Text", null],
    ["Document", "doc.filename", "native.Text", null],
    ["SearchResult", "result.sources.url", "native.Text", true],
    ["YesNo", "answer.yes_no", "native.YesNo", null],
    ["Date", "day.time", "native.Time", null],
    ["Html", "html.inner_html", "native.Text", null],
  ] as const)("walks a %s through %s to %s", (code, path, ref, multiplicity) => {
    expect(derivedRef(path, nativeConceptInfo(code))).toEqual({ ref, multiplicity });
  });

  it("walks the field of every page of a plural root into a list", () => {
    expect(derivedRef("pages.page_view", nativeConceptInfo("Page"), true)).toEqual({
      ref: "native.Image",
      multiplicity: true,
    });
  });

  it("refuses to enter a single-field native, which is a leaf", () => {
    expect(unresolvedReason("note.text", nativeConceptInfo("Text"))).toContain(
      "holds its value in a single field",
    );
    expect(unresolvedReason("count.number", nativeConceptInfo("Number"))).toContain("single field");
  });

  it("refuses to enter a structureless native", () => {
    expect(unresolvedReason("thing.field", nativeConceptInfo("Anything"))).toContain(
      "structureless by definition",
    );
    expect(unresolvedReason("thing.field", nativeConceptInfo("Dynamic"))).toContain(
      "structureless",
    );
  });
});

describe("deriveBinding — refinements", () => {
  it("walks a refinement through the structure it inherits", () => {
    const priority = concept(methodSet(), "shop", "PriorityOrder");
    expect(derivedRef("order.total", priority)).toEqual({
      ref: "native.Number",
      multiplicity: null,
    });
  });

  it("refuses to enter a refinement of a single-field native", () => {
    const remark = concept(methodSet(), "shop", "Remark");
    expect(unresolvedReason("remark.text", remark)).toContain("refines 'native.Text'");
  });

  it("stops at a refinement cycle", () => {
    const loop = concept(methodSet(), "shop", "Loop");
    expect(unresolvedReason("loop.field", loop)).toContain("cycle");
  });
});

describe("deriveBinding — paths it cannot walk", () => {
  it("names the fields a concept has when the segment is none of them", () => {
    const reason = unresolvedReason("order.missing", order());
    expect(reason).toContain("no field 'missing'");
    expect(reason).toContain("'reference'");
  });

  it("refuses a segment after a leaf", () => {
    expect(unresolvedReason("order.total.cents", order())).toContain("a number field");
  });

  it("refuses a list with no item type, and a type the standard lacks", () => {
    expect(unresolvedReason("order.loose", order())).toContain("no item_type");
    expect(unresolvedReason("order.weird", order())).toContain("'colour'");
  });

  it("refuses a concept declared with a description alone", () => {
    const note = concept(methodSet(), "shop", "Note");
    expect(unresolvedReason("note.body", note)).toContain("neither a structure nor refines");
  });

  it("refuses a structure a bundle does not show", () => {
    const legacy = concept(methodSet(), "shop", "Legacy");
    expect(unresolvedReason("legacy.field", legacy)).toContain("Python class");
  });

  it("refuses to walk into a dependency's concept", () => {
    expect(unresolvedReason("order.external.name", order())).toContain("dependency");
  });

  it("refuses a concept the method does not declare", () => {
    const stray: ConceptInfo = {
      code: "Stray",
      domain_code: "elsewhere",
      description: "",
      structure_class_name: "elsewhere__Stray",
      refines: null,
    };
    expect(unresolvedReason("stray.field", stray)).toContain("not declared in this method");
  });
});
