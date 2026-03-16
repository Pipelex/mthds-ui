import {
  createHighlighter,
  type Highlighter,
  type LanguageRegistration,
  type ThemeRegistrationRaw,
} from "shiki";
import mthdsGrammar from "./mthds.tmLanguage.json";
import { pipelexDarkTheme } from "./pipelexDarkTheme";
import { type MthdsThemeName, MTHDS_THEMES } from "./themes";

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
    })
      .then(async (highlighter) => {
        // No try/catch: all MTHDS_THEMES are bundled shiki themes and must load.
        // Swallowing errors here would let getAvailableThemes() advertise broken themes.
        for (const theme of MTHDS_THEMES.filter((t) => t !== "pipelex-dark")) {
          await highlighter.loadTheme(theme);
        }
        return highlighter;
      })
      .catch((err) => {
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
