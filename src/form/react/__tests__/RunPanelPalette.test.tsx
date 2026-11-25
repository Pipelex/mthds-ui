import React from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getPipeInputForm, getPipeIOContract } from "@pipelex/mthds-form";

import { RunPanel } from "@form/react/RunPanel";
import { getPaletteForTheme } from "@graph/graphConfig";
import { GRAPH_THEME } from "@graph/types";
import {
  CONTRACTS_OPTIONAL_STYLE_HINT,
  INPUT_FORM_OPTIONAL_STYLE_HINT,
} from "../__stories__/contracts/_generated.contracts";

/** The inline style of the panel's `<form>`, as the browser would read it. */
function formStyle(props: Partial<React.ComponentProps<typeof RunPanel>>): Map<string, string> {
  const contract = getPipeIOContract(
    CONTRACTS_OPTIONAL_STYLE_HINT,
    "village_noticeboard",
    "draft_notice",
  );
  const descriptor = getPipeInputForm(
    INPUT_FORM_OPTIONAL_STYLE_HINT,
    "village_noticeboard",
    "draft_notice",
  );
  if (!contract || !descriptor) throw new Error("the fixture moved");
  const html = renderToStaticMarkup(
    <RunPanel
      contract={contract}
      descriptor={descriptor}
      values={{}}
      onValuesChange={() => undefined}
      onRun={() => undefined}
      idPrefix="test"
      {...props}
    />,
  );
  const style = html.match(/<form[^>]*\sstyle="([^"]*)"/)?.[1];
  expect(style, "the panel's form carries no inline style").toBeDefined();
  const declarations = new Map<string, string>();
  // The markup escapes the quotes of a font stack, whose entity would otherwise split a value.
  const unescaped = style!
    .replaceAll("&quot;", '"')
    .replaceAll("&#x27;", "'")
    .replaceAll("&amp;", "&");
  for (const declaration of unescaped.split(";")) {
    const at = declaration.indexOf(":");
    if (at > 0) declarations.set(declaration.slice(0, at).trim(), declaration.slice(at + 1).trim());
  }
  return declarations;
}

describe("RunPanel's palette", () => {
  it("is the theme's palette when the host passes no overrides", () => {
    const style = formStyle({ theme: GRAPH_THEME.DARK });
    for (const [name, value] of Object.entries(getPaletteForTheme(GRAPH_THEME.DARK))) {
      expect(style.get(name), name).toBe(value);
    }
  });

  it("takes the host's paletteColors over the theme's, key by key", () => {
    const light = getPaletteForTheme(GRAPH_THEME.LIGHT);
    const style = formStyle({
      theme: GRAPH_THEME.LIGHT,
      paletteColors: { "--color-accent": "var(--link)", "--surface-panel": "var(--surface)" },
    });
    expect(style.get("--color-accent")).toBe("var(--link)");
    expect(style.get("--surface-panel")).toBe("var(--surface)");
    // Every key the host left alone keeps the theme's value.
    expect(style.get("--text-default")).toBe(light["--text-default"]);
  });
});
