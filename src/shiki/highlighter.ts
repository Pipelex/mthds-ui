import {
  createHighlighterCore,
  type HighlighterCore,
  type LanguageRegistration,
  type ThemeRegistrationRaw,
} from "shiki/core";
import { createOnigurumaEngine } from "shiki/engine/oniguruma";
import darkPlus from "shiki/themes/dark-plus.mjs";
import dracula from "shiki/themes/dracula.mjs";
import monokai from "shiki/themes/monokai.mjs";
import oneDarkPro from "shiki/themes/one-dark-pro.mjs";
import mthdsGrammar from "./mthds.tmLanguage.json";
import { pipelexDarkTheme } from "./pipelexDarkTheme";
import { type MthdsThemeName, MTHDS_THEMES } from "./themes";

const mthdsLang = {
  ...mthdsGrammar,
  name: "mthds",
} as unknown as LanguageRegistration;

let highlighterPromise: Promise<HighlighterCore> | null = null;

function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      engine: createOnigurumaEngine(import("shiki/wasm")),
      themes: [pipelexDarkTheme, darkPlus, monokai, dracula, oneDarkPro],
      langs: [mthdsLang],
    }).catch((err) => {
      highlighterPromise = null;
      throw err;
    });
  }
  return highlighterPromise;
}

export async function highlightMthds(
  code: string,
  theme: MthdsThemeName = "pipelex-dark",
): Promise<string> {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code, {
    lang: "mthds",
    theme,
  });
}

export function getAvailableThemes(): MthdsThemeName[] {
  return [...MTHDS_THEMES];
}

export function getMthdsGrammar(): LanguageRegistration {
  return mthdsLang;
}

export function getMthdsTheme(): ThemeRegistrationRaw {
  return pipelexDarkTheme;
}
