import {
  createHighlighterCore,
  type HighlighterCore,
  type LanguageRegistration,
  type ThemeRegistrationRaw,
} from "@shikijs/core";
import { createOnigurumaEngine } from "@shikijs/engine-oniguruma";
import mthdsGrammar from "./mthds.tmLanguage.json";
import { pipelexDarkTheme } from "./pipelexDarkTheme";
import { pipelexLightTheme } from "./pipelexLightTheme";
import { type MthdsThemeName, MTHDS_THEMES } from "./themes";

const mthdsLang = {
  ...mthdsGrammar,
  name: "mthds",
} as unknown as LanguageRegistration;

let highlighterPromise: Promise<HighlighterCore> | null = null;

function getHighlighter(): Promise<HighlighterCore> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighterCore({
      engine: createOnigurumaEngine(import("@shikijs/engine-oniguruma/wasm-inlined")),
      themes: [pipelexDarkTheme, pipelexLightTheme],
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

export function getMthdsTheme(name: MthdsThemeName = "pipelex-dark"): ThemeRegistrationRaw {
  return name === "pipelex-light" ? pipelexLightTheme : pipelexDarkTheme;
}

/** Both pipelex themes, for editors that register every theme up front (e.g. Monaco). */
export function getMthdsThemes(): ThemeRegistrationRaw[] {
  return [pipelexDarkTheme, pipelexLightTheme];
}
