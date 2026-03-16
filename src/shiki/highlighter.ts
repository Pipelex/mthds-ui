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

const bundledThemeNames = MTHDS_THEMES.filter((t) => t !== "pipelex-dark");

const loadedThemes = new Set<MthdsThemeName>(["pipelex-dark"]);
let highlighterPromise: Promise<Highlighter> | null = null;

function getHighlighter(): Promise<Highlighter> {
  if (!highlighterPromise) {
    highlighterPromise = createHighlighter({
      themes: [pipelexDarkTheme],
      langs: [mthdsLang],
    })
      .then(async (highlighter) => {
        for (const theme of bundledThemeNames) {
          try {
            await highlighter.loadTheme(theme);
            loadedThemes.add(theme);
          } catch {
            // Theme unavailable — omitted from getAvailableThemes()
          }
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
  return MTHDS_THEMES.filter((t) => loadedThemes.has(t));
}

export function getMthdsGrammar(): LanguageRegistration {
  return mthdsLang;
}

export function getMthdsTheme(): ThemeRegistrationRaw {
  return pipelexDarkTheme;
}
