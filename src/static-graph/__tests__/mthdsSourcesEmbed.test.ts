import { describe, it, expect } from "vitest";
import { parseMthdsSourcesEmbed, serializeMthdsSourcesEmbed } from "../mthdsSourcesEmbed";

describe("parseMthdsSourcesEmbed", () => {
  it("keeps name and content and drops anything else", () => {
    expect(parseMthdsSourcesEmbed([{ name: "bundle.mthds", content: "x", extra: true }])).toEqual([
      { name: "bundle.mthds", content: "x" },
    ]);
  });

  it.each([
    ["an object instead of an array", { name: "bundle.mthds", content: "" }, /JSON array/],
    ["an empty array", [], /lists no \.mthds file/],
    ["an entry that is not an object", ["bundle.mthds"], /entry 0 is not/],
    ["an entry that is an array", [["bundle.mthds", ""]], /entry 0 is not/],
    ["a missing name", [{ content: "" }], /entry 0 has no "name"/],
    ["a blank name", [{ name: "  ", content: "" }], /entry 0 has no "name"/],
    ["a missing content", [{ name: "bundle.mthds" }], /"bundle\.mthds"\) has no "content"/],
    [
      "a repeated name",
      [
        { name: "bundle.mthds", content: "" },
        { name: "bundle.mthds", content: "" },
      ],
      /entry 1 repeats the name "bundle\.mthds"/,
    ],
  ])("throws on %s", (_label, raw, message) => {
    expect(() => parseMthdsSourcesEmbed(raw)).toThrow(message);
  });
});

describe("serializeMthdsSourcesEmbed", () => {
  // Every spelling that ends a script element or changes how its text is
  // tokenized: the plain end tag, one with a space or a slash before `>`, any
  // case, and the `<!--` ... `<script` pair that hides the real end tag.
  const HOSTILE = [
    "</script>",
    "</script >",
    "</SCRIPT/>",
    '<!-- <script>alert("x")</script> -->',
    "a <b>bold</b> prompt",
  ].join("\n");

  it("leaves no `<` for the HTML parser to act on", () => {
    const text = serializeMthdsSourcesEmbed([{ name: "bundle.mthds", content: HOSTILE }]);
    expect(text).not.toContain("<");
    expect(text).toContain("\\u003c/script>");
  });

  it("reads back through JSON.parse as exactly the files given", () => {
    const sources = [
      { name: "bundle.mthds", content: HOSTILE },
      { name: "helpers.mthds", content: 'domain = "demo"\n' },
    ];
    expect(JSON.parse(serializeMthdsSourcesEmbed(sources))).toEqual(sources);
  });

  it("keeps the order given and writes only name and content", () => {
    const sources = [
      { name: "helpers.mthds", content: "h", uri: "file:///m/helpers.mthds" },
      { name: "bundle.mthds", content: "b", uri: "file:///m/bundle.mthds" },
    ];
    expect(JSON.parse(serializeMthdsSourcesEmbed(sources))).toEqual([
      { name: "helpers.mthds", content: "h" },
      { name: "bundle.mthds", content: "b" },
    ]);
  });

  it("refuses a list the bundle would refuse", () => {
    expect(() => serializeMthdsSourcesEmbed([])).toThrow(/lists no \.mthds file/);
    expect(() =>
      serializeMthdsSourcesEmbed([
        { name: "bundle.mthds", content: "" },
        { name: "bundle.mthds", content: "" },
      ]),
    ).toThrow(/repeats the name/);
  });
});
