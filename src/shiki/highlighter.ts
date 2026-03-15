import {
  createHighlighter,
  type Highlighter,
  type LanguageRegistration,
  type ThemeRegistrationRaw,
} from "shiki";
import mthdsGrammar from "./mthds.tmLanguage.json";
import { pipelexDarkTheme } from "./pipelexDarkTheme";

const mthdsLang = {
  ...mthdsGrammar,
  name: "mthds",
} as unknown as LanguageRegistration;

let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [pipelexDarkTheme],
      langs: [mthdsLang],
    }).catch((err) => {
      highlighterPromise = null;
      throw err;
    });
  }
  return highlighterPromise;
}

export async function highlightMthds(code: string): Promise<string> {
  const highlighter = await getHighlighter();
  return highlighter.codeToHtml(code, {
    lang: "mthds",
    theme: "pipelex-dark",
  });
}

export function getMthdsGrammar(): LanguageRegistration {
  return mthdsLang;
}

export function getMthdsTheme(): ThemeRegistrationRaw {
  return pipelexDarkTheme;
}
